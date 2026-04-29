const { app, Tray, Menu, Notification, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const config = require("./config");
const { syncWallpapers } = require("./downloader");
const { setWallpaper } = require("./wallpaperManager");
const { loadSettings, saveSettings } = require("./settings");

let tray = null;
let mainWindow = null;
let settings = null;
let slideshowTimer = null;
let autoSyncTimer = null;
let currentImageIndex = 0;
let isQuitting = false;

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, "ui", "index.html"));
  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function getImages() {
  const sourceDir = config.SOURCE_DIR;
  const userDir = config.WALLPAPER_DIR;
  let files = [];

  if (fs.existsSync(sourceDir)) {
    fs.readdirSync(sourceDir).filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i)).forEach(f => {
      files.push({ filename: f, path: path.join(sourceDir, f) });
    });
  }
  if (fs.existsSync(userDir)) {
    fs.readdirSync(userDir).filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i)).forEach(f => {
      if (!files.find(existing => existing.filename === f)) {
        files.push({ filename: f, path: path.join(userDir, f) });
      }
    });
  }
  return files;
}

async function nextSlideshowImage() {
  let images = getImages();
  if (images.length === 0) return;

  if (settings.selectedImages && settings.selectedImages.length > 0) {
    const selected = images.filter(img => settings.selectedImages.includes(img.path));
    if (selected.length > 0) {
      images = selected;
    }
  }

  currentImageIndex = (currentImageIndex + 1) % images.length;
  const image = images[currentImageIndex];

  try {
    // Add a small delay to ensure file is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    await setWallpaper(image.path);
    if (mainWindow) mainWindow.webContents.send("sync-complete");
  } catch (err) {
    console.error("Slideshow error:", err.message);
    console.error("Full error:", err);
    if (mainWindow) mainWindow.webContents.send("app-error", `Failed to set wallpaper: ${err.message}`);
  }
}

function startSlideshow() {
  if (slideshowTimer) clearInterval(slideshowTimer);
  if (settings.slideshow) {
    const interval = settings.slideshowInterval || 10000;
    slideshowTimer = setInterval(nextSlideshowImage, interval);
  }
}

const { dialog } = require("electron");

function getSyncConfig() {
  const apiUrl =
    (settings && typeof settings.apiUrl === "string" && settings.apiUrl.trim()) ||
    process.env.WALLPAPER_SYNC_API_URL ||
    config.API_URL;

  const syncToken =
    (settings && typeof settings.syncToken === "string" && settings.syncToken.trim()) ||
    process.env.WALLPAPER_SYNC_TOKEN ||
    config.SYNC_TOKEN;

  return {
    ...config,
    API_URL: apiUrl,
    SYNC_TOKEN: syncToken
  };
}

async function runAutoSync(promptUser = false, notifyOnError = false) {
  try {
    const syncConfig = getSyncConfig();
    const { latestFile, downloadCount, serverFiles, error } = await syncWallpapers(syncConfig);

    if (error) {
      if (notifyOnError && mainWindow) {
        mainWindow.webContents.send("app-error", `Sync failed: ${error}`);
      }
      return { downloadCount: 0, orphanedCount: 0, error };
    }

    let orphanedCount = 0;
    if (serverFiles && serverFiles.length > 0) {
      const localFiles = fs
        .readdirSync(config.WALLPAPER_DIR)
        .filter((f) => f.match(/\.(jpg|jpeg|png|webp)$/i));
      for (const local of localFiles) {
        if (!serverFiles.includes(local)) {
          if (promptUser && mainWindow) {
            const result = await dialog.showMessageBox(mainWindow, {
              type: 'question',
              buttons: ['Keep', 'Delete'],
              defaultId: 1,
              title: 'Server Deletion Detected',
              message: `The image '${local}' was deleted from the server. Do you want to keep your local copy or delete it?`
            });
            if (result.response === 1) { // Delete
              try {
                fs.unlinkSync(path.join(config.WALLPAPER_DIR, local));
                orphanedCount++;
              } catch (e) {
                console.error("Error unlinking", e);
              }
            }
          }
        }
      }
    }

    if (latestFile || orphanedCount > 0) {
      settings.lastSyncDate = Date.now();
      saveSettings(settings);
      if (mainWindow) mainWindow.webContents.send("sync-complete");
    }

    return { downloadCount, orphanedCount, error: null };
  } catch (err) {
    console.error("Auto Sync Error:", err.message);
    const message = err && err.message ? err.message : String(err);
    if (notifyOnError && mainWindow) {
      mainWindow.webContents.send("app-error", `Sync failed: ${message}`);
    }
    return { downloadCount: 0, orphanedCount: 0, error: message };
  }
}

function startAutoSync() {
  if (autoSyncTimer) clearInterval(autoSyncTimer);
  if (settings.autoSync) {
    autoSyncTimer = setInterval(runAutoSync, 1000 * 60 * 60);
  }
}

function setupTray() {
  const iconPath = path.join(__dirname, "icon.png");
  if (!fs.existsSync(iconPath)) return;

  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Open Dashboard", click: createMainWindow },
    { type: 'separator' },
    {
      label: "Quit", click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setToolTip("Wallpaper Sync");
  tray.setContextMenu(contextMenu);

  tray.on('double-click', createMainWindow);
}

app.whenReady().then(() => {
  settings = loadSettings();
  createMainWindow();
  setupTray();

  startSlideshow();
  startAutoSync();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (isQuitting) app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

ipcMain.handle("get-settings", () => {
  return settings;
});

ipcMain.handle("toggle-auto-sync", (event, state) => {
  settings.autoSync = state;
  saveSettings(settings);
  startAutoSync();
});

ipcMain.handle("toggle-slideshow", (event, state) => {
  settings.slideshow = state;
  saveSettings(settings);
  startSlideshow();
});

ipcMain.handle("update-interval", (event, ms) => {
  settings.slideshowInterval = ms;
  saveSettings(settings);
  startSlideshow();
});

ipcMain.handle("sync-now", async () => {
  const result = await runAutoSync(false, true);
  await nextSlideshowImage();
  return result;
});

ipcMain.handle("fetch-server", async () => {
  return await runAutoSync(true, true);
});

ipcMain.handle("get-wallpapers", () => {
  return getImages();
});

ipcMain.handle("upload-wallpapers", async (event, fileDataArray) => {
  const dir = config.WALLPAPER_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for (const fileObj of fileDataArray) {
    const ext = path.extname(fileObj.name) || '.jpg';
    const shortName = Date.now() + '_' + Math.floor(Math.random() * 10000) + ext;
    const destPath = path.join(dir, shortName);
    try {
      fs.writeFileSync(destPath, Buffer.from(fileObj.data));
    } catch (err) {
      console.error(`Error saving ${fileObj.name}:`, err);
    }
  }
  if (mainWindow) mainWindow.webContents.send("sync-complete");
});

ipcMain.handle("delete-wallpaper", async (event, absolutePath) => {
  try {
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
    if (settings.selectedImages) {
      settings.selectedImages = settings.selectedImages.filter(p => p !== absolutePath);
      saveSettings(settings);
    }
  } catch (err) {
    console.error("Error deleting:", err);
  }
});

ipcMain.handle("toggle-selection", async (event, absolutePath, isSelected) => {
  if (!settings.selectedImages) settings.selectedImages = [];
  if (isSelected) {
    if (!settings.selectedImages.includes(absolutePath)) {
      settings.selectedImages.push(absolutePath);
    }
  } else {
    settings.selectedImages = settings.selectedImages.filter(p => p !== absolutePath);
  }
  saveSettings(settings);
});

ipcMain.handle("set-wallpaper", async (event, absolutePath) => {
  try {
    await setWallpaper(absolutePath);
    settings.activeWallpaper = absolutePath;
    saveSettings(settings);
    if (mainWindow) mainWindow.webContents.send("sync-complete");
    return { success: true };
  } catch (err) {
    console.error("set-wallpaper error:", err);
    if (mainWindow) mainWindow.webContents.send("app-error", "Failed to set desktop wallpaper. File might be invalid.");
    throw err; // Throw so the renderer knows it failed
  }
});
