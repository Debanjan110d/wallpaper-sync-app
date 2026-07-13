const { app, Tray, Menu, Notification, BrowserWindow, ipcMain, dialog, shell } = require("electron");

// Ensure a single running instance at startup
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  app.exit(0);
}

const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");
const os = require("os");

// --- Windows stability: force userData/cache into LocalAppData (writable) ---
// This prevents Chromium disk cache errors like "Unable to move the cache: Access is denied".
const USER_DATA_PATHS = (() => {
  try {
    const oldUserData = app.getPath("userData");
    const localAppData = process.platform === "win32" ? process.env.LOCALAPPDATA : "";
    const desiredUserData = (process.platform === "win32" && localAppData)
      ? path.join(localAppData, "Wallpaper Sync App")
      : oldUserData;

    // Force Chromium cache to a guaranteed-writable location (Temp).
    // Use a per-launch directory to avoid lock/contention issues that can cause
    // "Unable to move/create cache" (0x5) on Windows. so long as the temp dir is writable, this should succeed even in restrictive environments.Hehe
    const desiredCache = path.join(os.tmpdir(), "wallpaper-sync-cache", String(process.pid));

    if (desiredUserData && desiredUserData !== oldUserData) {
      app.setPath("userData", desiredUserData);
    }

    try {
      if (desiredCache) app.setPath("cache", desiredCache);
    } catch {
      // ignore it bhai
    }

    const activeUserData = app.getPath("userData");
    const activeCache = (() => {
      try {
        return app.getPath("cache");
      } catch {
        return path.join(activeUserData, "Cache");
      }
    })();

    try {
      if (activeUserData) {
        if (!fs.existsSync(activeUserData)) fs.mkdirSync(activeUserData, { recursive: true });
      }
      if (activeCache) {
        if (!fs.existsSync(activeCache)) fs.mkdirSync(activeCache, { recursive: true });
      }
    } catch {
      // ignore
    }

    // Cache dirs should live under a writable path. so if you do not have write access to the default userData path, at least the cache will work (even if it can't be moved).
    app.commandLine.appendSwitch("disk-cache-dir", activeCache);
    // Ensure Chromium uses our chosen userData directory (avoid internal moves).
    app.commandLine.appendSwitch("user-data-dir", activeUserData);
    app.commandLine.appendSwitch("gpu-shader-cache-dir", path.join(activeUserData, "GPUCache"));
    app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

    // Keep disk cache tiny / effectively disabled to reduce IO and avoid cache move attempts.
    app.commandLine.appendSwitch("disable-http-cache");
    app.commandLine.appendSwitch("disk-cache-size", "1");
    app.commandLine.appendSwitch("media-cache-size", "1");

    // Best-effort cleanup of old cache dirs (prevents Chromium trying to move them).
    try {
      const oldCache = path.join(oldUserData, "Cache");
      const oldGpuCache = path.join(oldUserData, "GPUCache");
      if (fs.existsSync(oldCache)) fs.rmSync(oldCache, { recursive: true, force: true });
      if (fs.existsSync(oldGpuCache)) fs.rmSync(oldGpuCache, { recursive: true, force: true });
    } catch {
      // ignore
    }

    return { oldUserData, activeUserData, activeCache };
  } catch {
    return { oldUserData: "", activeUserData: "", activeCache: "" };
  }
})();

function ensureDir(p) {
  try {
    if (!p) return;
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  } catch {
    // ignore
  }
}

function migrateUserDataIfNeeded() {
  try {
    const oldBase = USER_DATA_PATHS.oldUserData;
    const newBase = USER_DATA_PATHS.activeUserData;
    if (!oldBase || !newBase || oldBase === newBase) return;

    ensureDir(newBase);

    const oldSettings = path.join(oldBase, "settings.json");
    const newSettings = path.join(newBase, "settings.json");
    if (fs.existsSync(oldSettings) && !fs.existsSync(newSettings)) {
      fs.copyFileSync(oldSettings, newSettings);
    }

    const oldWallpapers = path.join(oldBase, "wallpapers");
    const newWallpapers = path.join(newBase, "wallpapers");
    if (fs.existsSync(oldWallpapers) && !fs.existsSync(newWallpapers)) {
      fs.mkdirSync(newWallpapers, { recursive: true });
      for (const f of fs.readdirSync(oldWallpapers)) {
        try {
          fs.copyFileSync(path.join(oldWallpapers, f), path.join(newWallpapers, f));
        } catch {
          // ignore per-file errors
        }
      }
    }
  } catch {
    // ignore
  }
}

const config = require("./config");
const { syncWallpapers } = require("./downloader");
const { setWallpaper } = require("./wallpaperManager");
const { loadSettings, saveSettings } = require("./settings");
const axios = require("axios");
const {
  loadLocalMetadata,
  createCategoryLocally,
  createCollectionLocally,
  createTagLocally,
  updateWallpaperMetadataLocally,
  syncMetadataWithServer
} = require("./metadataCache");

let tray = null;
let mainWindow = null;
let settings = null;
let slideshowTimer = null;
let currentImageIndex = 0;
let isQuitting = false;
let didStartupNewCheck = false;

let updateState = {
  available: false,
  downloaded: false,
  version: null,
  notes: null,
  checking: false,
  downloading: false
};

let didStartupUpdateCheck = false;
let didPromptInstallUpdate = false;
let pendingInstallPrompt = false;

// Dev-only diagnostics for single-instance behavior.
// Helps confirm that all launches share the same userData dir (required for the lock).
if (!app.isPackaged) {
  try {
    const ud = (() => {
      try { return app.getPath("userData"); } catch { return ""; }
    })();
    const cd = (() => {
      try { return app.getPath("cache"); } catch { return ""; }
    })();
    // eslint-disable-next-line no-console
    console.log(`[startup] pid=${process.pid} name=${app.getName()} userData=${ud} cache=${cd}`);
  } catch {
    // ignore
  }
}

app.on("second-instance", async () => {
  try {
    await app.whenReady();
  } catch {
    // ignore
  }

  // If we already have a window, bring it to front.
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    return;
  }

  // If we're running tray-only (startup) or the window was destroyed, recreate it.
  createMainWindow();
});

function parseGithubRepoFromUrl(maybeUrl) {
  const url = String(maybeUrl || "").trim();
  if (!url) return null;
  const match = url.match(/github\.com\/(.*?)\/(.*?)(?:\.git)?$/i);
  if (!match) return null;
  const owner = (match[1] || "").replace(/^\/+|\/+$/g, "");
  const repo = (match[2] || "").replace(/^\/+|\/+$/g, "");
  if (!owner || !repo) return null;
  return { owner, repo };
}

function getGithubRepoFromPackageJson() {
  try {
    // Works both in dev and packaged app (asar is disabled).
    // eslint-disable-next-line global-require
    const pkg = require("./package.json");
    const url = pkg && pkg.repository && pkg.repository.url ? pkg.repository.url : "";
    return parseGithubRepoFromUrl(url);
  } catch {
    return null;
  }
}

async function getLatestInstallerDownloadUrl() {
  const fallback = "https://github.com/Debanjan110d/wallpaper-sync-app/releases/latest";
  const repo = getGithubRepoFromPackageJson() || { owner: "Debanjan110d", repo: "wallpaper-sync-app" };

  try {
    const apiUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`;
    const res = await axios.get(apiUrl, {
      timeout: 15_000,
      headers: {
        "User-Agent": "wallpaper-sync-app",
        "Accept": "application/vnd.github+json"
      }
    });

    const data = res && res.data ? res.data : null;
    const assets = data && Array.isArray(data.assets) ? data.assets : [];
    const exeAsset = assets.find((a) => {
      const name = (a && a.name ? String(a.name) : "").toLowerCase();
      return name.endsWith(".exe") && !name.endsWith(".exe.blockmap");
    });

    const direct = exeAsset && exeAsset.browser_download_url ? String(exeAsset.browser_download_url) : "";
    if (direct) return direct;

    const html = data && data.html_url ? String(data.html_url) : "";
    return html || fallback;
  } catch (err) {
    console.warn("Failed to resolve latest installer URL:", err && err.message ? err.message : String(err));
    return fallback;
  }
}

async function openLatestInstallerDownloadInBrowser() {
  const url = await getLatestInstallerDownloadUrl();
  try {
    await shell.openExternal(url);
  } catch (err) {
    console.error("Failed to open browser for download:", err);
  }
  return url;
}

function stripHtml(input) {
  return String(input || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeReleaseNotes(rawNotes, maxLen = 140) {
  if (!rawNotes) return "";
  let text = "";

  // electron-updater may provide releaseNotes as a string or an array of note objects
  if (Array.isArray(rawNotes)) {
    const first = rawNotes[0];
    if (first && typeof first.note === "string") text = first.note;
    else text = JSON.stringify(first);
  } else {
    text = String(rawNotes);
  }

  text = stripHtml(text);
  if (text.length > maxLen) return text.slice(0, maxLen - 1) + "…";
  return text;
}

function normalizeIsoTimestamp(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function registerWindowsStartupOnce() {
  if (process.platform !== "win32") return;
  if (!settings) return;

  // Windows Startup Apps integration is only reliable for installed/packaged builds.
  // Avoid registering from dev runs (`npm start`) because it can: I mean hote pare na amar sathe hoyeche tai sabdhan 
  // - create an unusable login item pointing at Electron
  // - set a "registered" flag that prevents the installed app from registering later
  if (!app.isPackaged) return;

  const currentExecPath = process.execPath;
  const previouslyRegisteredExecPath = settings.startupRegisteredExecPath;
  const loginSettings = app.getLoginItemSettings();

  // If Windows already has this enabled, just persist our bookkeeping.
  if (loginSettings && loginSettings.openAtLogin) {
    if (!settings.startupRegistered || previouslyRegisteredExecPath !== currentExecPath) {
      settings.startupRegistered = true;
      settings.startupRegisteredExecPath = currentExecPath;
      saveSettings(settings);
    }
    return;
  }

  // Register on first run so the entry shows up in Windows "Startup apps".
  // We only do this once to avoid re-enabling startup after the user disables it in Windows.
  // If we've already registered for *this* installed build, assume the user may have disabled it.
  if (settings.startupRegistered && previouslyRegisteredExecPath === currentExecPath) return;

  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: currentExecPath
    });

    const after = app.getLoginItemSettings();
    if (after && after.openAtLogin) {
      settings.startupRegistered = true;
      settings.startupRegisteredExecPath = currentExecPath;
      saveSettings(settings);
    } else {
      console.warn(
        "Startup registration did not stick (openAtLogin still false)." +
          " This can happen if the app isn't installed, lacks permissions, or is blocked by policy."
      );
    }
  } catch (err) {
    console.error("Failed to register startup:", err);
  }
}

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
  mainWindow.on("show", () => {
    if (mainWindow && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send("app:window-shown");
    }
  });

  // If an update finished downloading while we were running tray-only,
  // prompt the user once they open the dashboard.
  mainWindow.once("show", () => {
    if (pendingInstallPrompt) {
      pendingInstallPrompt = false;
      promptInstallUpdateIfPossible();
    }
  });

  mainWindow.on("close", (event) => {
    // Optimization: when the user closes the dashboard, destroy the window so the
    // renderer process doesn't keep consuming resources in the background.
    // The app continues running in the tray.
    if (!isQuitting) return;
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function promptInstallUpdateIfPossible() {
  if (!app.isPackaged || process.platform !== "win32") return;
  if (!updateState.downloaded) return;
  if (didPromptInstallUpdate) return;

  // Only prompt if we have a visible window (otherwise keep it as a tray action).
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) {
    pendingInstallPrompt = true;
    return;
  }

  didPromptInstallUpdate = true;
  const v = updateState.version ? `v${updateState.version}` : "";
  const notes = updateState.notes ? `\n\n${updateState.notes}` : "";

  try {
    dialog
      .showMessageBox(mainWindow, {
        type: "question",
        buttons: ["Install and restart", "Later"],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
        title: "Update ready",
        message: `An update ${v} is ready to install.`.trim(),
        detail: ("The app will restart to finish installing." + notes).trim()
      })
      .then((result) => {
        if (result && result.response === 0) {
          try {
            autoUpdater.quitAndInstall();
          } catch (err) {
            console.error("Failed to install update:", err);
          }
        }
      })
      .catch(() => {
        // ignore
      });
  } catch {
    // ignore
  }
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
    const userFiles = fs
      .readdirSync(userDir)
      .filter((f) => f.match(/\.(jpg|jpeg|png|webp)$/i))
      .map((f) => {
        const full = path.join(userDir, f);
        let mtimeMs = 0;
        try {
          mtimeMs = fs.statSync(full).mtimeMs || 0;
        } catch {
          mtimeMs = 0;
        }
        return { filename: f, path: full, mtimeMs };
      })
      .sort((a, b) => a.mtimeMs - b.mtimeMs);

    for (const f of userFiles) {
      if (!files.find((existing) => existing.filename === f.filename)) {
        files.push({ filename: f.filename, path: f.path });
      }
    }
  }
  return files;
}

async function nextSlideshowImage() {
  let images = getImages();
  if (images.length === 0) return;

  // 1. Filter by slideshowSource
  const source = settings.slideshowSource || { type: "all" };
  if (source.type === "favorites") {
    if (settings.selectedImages && settings.selectedImages.length > 0) {
      images = images.filter((img) => settings.selectedImages.includes(img.path));
    }
  } else if (source.type === "collection" && source.id) {
    const metadata = loadLocalMetadata();
    const colId = Number(source.id);
    images = images.filter((img) => {
      const hash = path.basename(img.filename, path.extname(img.filename));
      const meta = metadata.wallpaper_metadata[hash];
      return meta && Number(meta.collection_id) === colId;
    });
  } else if (source.type === "category" && source.id) {
    const metadata = loadLocalMetadata();
    const catId = Number(source.id);
    const matchedCols = metadata.collections
      .filter((c) => c.category_id === catId)
      .map((c) => c.id);
    images = images.filter((img) => {
      const hash = path.basename(img.filename, path.extname(img.filename));
      const meta = metadata.wallpaper_metadata[hash];
      return meta && matchedCols.includes(Number(meta.collection_id));
    });
  }

  if (images.length === 0) return;

  // 2. Sort/Order images
  const order = settings.slideshowOrder || "sequential";
  if (order === "random") {
    if (images.length > 1) {
      let nextIndex = currentImageIndex;
      for (let tries = 0; tries < 6 && nextIndex === currentImageIndex; tries++) {
        nextIndex = Math.floor(Math.random() * images.length);
      }
      currentImageIndex = nextIndex;
    } else {
      currentImageIndex = 0;
    }
  } else if (order === "shuffle") {
    // Fisher-Yates shuffle algorithm
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = images[i];
      images[i] = images[j];
      images[j] = temp;
    }
    currentImageIndex = (currentImageIndex + 1) % images.length;
  } else if (order === "newest") {
    // Sort by modified time descending (newest first)
    images = images
      .map((img) => {
        let mtimeMs = 0;
        try {
          mtimeMs = fs.statSync(img.path).mtimeMs;
        } catch {}
        return { ...img, mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    currentImageIndex = (currentImageIndex + 1) % images.length;
  } else {
    // Default sequential
    currentImageIndex = (currentImageIndex + 1) % images.length;
  }

  // Ensure index is within range if array shrank
  if (currentImageIndex >= images.length) {
    currentImageIndex = 0;
  }

  const image = images[currentImageIndex];

  try {
    // Add a small delay to ensure file is ready
    await new Promise((resolve) => setTimeout(resolve, 100));
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

function getSyncConfig() {
  const apiUrl =
    (settings && typeof settings.apiUrl === "string" && settings.apiUrl.trim()) ||
    process.env.WALLPAPER_SYNC_API_URL ||
    config.API_URL;

  const syncToken =
    (settings && typeof settings.syncToken === "string" && settings.syncToken.trim()) ||
    process.env.WALLPAPER_SYNC_TOKEN ||
    config.SYNC_TOKEN;

  const rawCursor = settings && typeof settings.lastSyncCursor === "string" ? settings.lastSyncCursor : "";
  const cursorIso = normalizeIsoTimestamp(rawCursor);

  return {
    ...config,
    API_URL: apiUrl,
    SYNC_TOKEN: syncToken,
    // Always send a strict ISO timestamp. If the saved cursor is invalid, treat as empty.
    LAST_SYNC_CURSOR: cursorIso || "",
    IGNORED_SERVER_FILES: Array.isArray(settings && settings.ignoredServerFiles)
      ? settings.ignoredServerFiles
      : []
  };
}

async function checkForNewWallpapersOnce() {
  if (didStartupNewCheck) return;
  didStartupNewCheck = true;

  try {
    const syncConfig = getSyncConfig();
    const cursor = (syncConfig.LAST_SYNC_CURSOR || "").trim();
    if (!cursor) return;

    const headers = {};
    if (syncConfig.SYNC_TOKEN) headers["x-sync-token"] = syncConfig.SYNC_TOKEN;

    const url = new URL(syncConfig.API_URL);
    url.searchParams.set("since", cursor);
    url.searchParams.set("countOnly", "1");

    const res = await axios.get(url.toString(), { headers, timeout: 15_000 });
    const count = Number(res?.data?.count || 0);
    if (!Number.isFinite(count) || count <= 0) return;

    if (Notification.isSupported()) {
      new Notification({
        title: "New wallpapers available",
        body: count === 1 ? "1 new wallpaper is available." : `${count} new wallpapers are available.`,
      }).show();
    }

    // Optional: renderer can surface a lightweight hint (no polling).
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("app-error", count === 1
        ? "1 new wallpaper is available on the server."
        : `${count} new wallpapers are available on the server.`);
    }
  } catch (err) {
    // Silent failure: we keep startup lightweight and avoid noisy errors.
  }
}

async function runAutoSync(promptUser = false, notifyOnError = false) {
  try {
    const syncConfig = getSyncConfig();
    if (mainWindow) mainWindow.webContents.send("download-progress", 0);

    // "Fetch from Server" should be a full reconcile; background sync should be incremental.
    const fullSync = !!promptUser || !(syncConfig.LAST_SYNC_CURSOR && String(syncConfig.LAST_SYNC_CURSOR).trim());

    const {
      latestFile,
      downloadCount,
      serverFiles,
      maxCreatedAt,
      error
    } = await syncWallpapers(
      { ...syncConfig, FULL_SYNC: fullSync },
      (percent) => {
      if (mainWindow) mainWindow.webContents.send("download-progress", percent);
      }
    );
    if (mainWindow) mainWindow.webContents.send("download-progress", 100);

    if (error) {
      if (notifyOnError && mainWindow) {
        mainWindow.webContents.send("app-error", `Sync failed: ${error}`);
      }
      return { downloadCount: 0, orphanedCount: 0, error };
    }

    let serverDeletedCount = 0;
    if (fullSync && serverFiles && serverFiles.length > 0) {
      const localFiles = fs
        .readdirSync(config.WALLPAPER_DIR)
        .filter((f) => f.match(/\.(jpg|jpeg|png|webp)$/i));
      for (const local of localFiles) {
        if (!serverFiles.includes(local)) {
          // Non-blocking UX: keep local copies; just report count.
          serverDeletedCount++;
        }
      }
    }

    if (maxCreatedAt && typeof maxCreatedAt === "string") {
      const normalized = normalizeIsoTimestamp(maxCreatedAt);
      if (normalized) {
        settings.lastSyncCursor = normalized;
        saveSettings(settings);
      }
    }

    if (latestFile) {
      settings.lastSyncDate = Date.now();
      saveSettings(settings);
      if (mainWindow) mainWindow.webContents.send("sync-complete");
    }

    return { downloadCount, orphanedCount: 0, serverDeletedCount, error: null };
  } catch (err) {
    console.error("Auto Sync Error:", err.message);
    const message = err && err.message ? err.message : String(err);
    if (notifyOnError && mainWindow) {
      mainWindow.webContents.send("app-error", `Sync failed: ${message}`);
    }
    return { downloadCount: 0, orphanedCount: 0, serverDeletedCount: 0, error: message };
  }
}

function setupTray() {
  const iconPath = path.join(__dirname, "icon.png");
  if (!fs.existsSync(iconPath)) return;

  tray = new Tray(iconPath);

  refreshTrayMenu();

  tray.on('double-click', createMainWindow);
}

function refreshTrayMenu() {
  if (!tray) return;

  const template = [];

  if (updateState.available) {
    const label = updateState.version
      ? `Update available: v${updateState.version}`
      : "Update available";
    template.push({ label, enabled: false });
    if (updateState.notes) {
      template.push({ label: updateState.notes, enabled: false });
    }

    template.push({
      label: "Download installer (browser)",
      click: async () => {
        try {
          await openLatestInstallerDownloadInBrowser();
        } catch (err) {
          console.error("Failed to open download in browser:", err);
        }
      }
    });
  } else {
    template.push({
      label: updateState.checking ? "Checking for updates…" : "Check for updates",
      enabled: !updateState.checking,
      click: () => checkForUpdates({ userInitiated: true })
    });
  }

  template.push({ type: "separator" });
  template.push({ label: "Open Dashboard", click: createMainWindow });
  template.push({ type: "separator" });
  template.push({
    label: "Quit",
    click: () => {
      isQuitting = true;
      app.quit();
    }
  });

  const tooltipBase = "Wallpaper Sync";
  const tooltip = updateState.available
    ? `${tooltipBase} • Update available`
    : tooltipBase;

  tray.setToolTip(tooltip);
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function getUpdateStateSnapshot() {
  return {
    supported: app.isPackaged && process.platform === "win32",
    available: !!updateState.available,
    downloaded: !!updateState.downloaded,
    version: updateState.version,
    notes: updateState.notes,
    checking: !!updateState.checking,
    downloading: !!updateState.downloading
  };
}

function broadcastUpdateState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updater:state", getUpdateStateSnapshot());
  }
}

function setupAutoUpdater() {
  // Only works reliably for packaged installs (NSIS installer / installed app)
  if (!app.isPackaged) return;
  if (process.platform !== "win32") return;

  // Keep auto-download disabled; we open the installer in the browser instead.
  autoUpdater.autoDownload = false;

  autoUpdater.on("checking-for-update", () => {
    updateState.checking = true;
    refreshTrayMenu();
    broadcastUpdateState();
  });

  autoUpdater.on("update-available", (info) => {
    updateState.checking = false;
    updateState.available = true;
    updateState.version = info && info.version ? info.version : null;
    updateState.notes = summarizeReleaseNotes(info && info.releaseNotes);
    updateState.downloading = false;
    refreshTrayMenu();
    broadcastUpdateState();

    if (Notification.isSupported()) {
      const bodyParts = [];
      if (updateState.version) bodyParts.push(`v${updateState.version}`);
      if (updateState.notes) bodyParts.push(updateState.notes);
      new Notification({
        title: "Update available",
        body: bodyParts.join(" — ") || "A new version is available."
      }).show();
    }

    // Do not download inside the app; user will download installer via browser.
  });

  autoUpdater.on("update-not-available", () => {
    updateState.checking = false;
    updateState.available = false;
    updateState.downloaded = false;
    updateState.version = null;
    updateState.notes = null;
    updateState.downloading = false;
    refreshTrayMenu();
    broadcastUpdateState();
  });

  autoUpdater.on("download-progress", () => {
    updateState.downloading = false;
    refreshTrayMenu();
    broadcastUpdateState();
  });

  autoUpdater.on("update-downloaded", () => {
    updateState.downloading = false;
    updateState.downloaded = false;
    refreshTrayMenu();
    broadcastUpdateState();

    if (Notification.isSupported()) {
      new Notification({
        title: "Update ready",
        body: "Install now (or later) from the app."
      }).show();
    }

    // No in-app install flow; installer is downloaded via browser.
  });

  autoUpdater.on("error", (err) => {
    updateState.checking = false;
    updateState.downloading = false;
    refreshTrayMenu();
    broadcastUpdateState();
    console.error("Auto-updater error:", err);
  });

  // Startup-only check (no polling), like wallpaper update check.
  if (!didStartupUpdateCheck) {
    didStartupUpdateCheck = true;
    setTimeout(() => checkForUpdates({ userInitiated: false }), 4000);
  }
}

function checkForUpdates({ userInitiated }) {
  if (!app.isPackaged) return;
  if (process.platform !== "win32") return;
  if (updateState.checking) return;

  updateState.checking = true;
  refreshTrayMenu();
  broadcastUpdateState();

  try {
    autoUpdater.checkForUpdates();
  } catch (err) {
    updateState.checking = false;
    refreshTrayMenu();
    broadcastUpdateState();
    console.error("Failed to check for updates:", err);

    if (userInitiated && Notification.isSupported()) {
      new Notification({
        title: "Update check failed",
        body: "Could not check for updates. Please try again later."
      }).show();
    }
  }
}

if (gotSingleInstanceLock) app.whenReady().then(() => {
  migrateUserDataIfNeeded();
  settings = loadSettings();
  setupTray();

  // Cold launch wallpaper update check (runs exactly once on startup)
  checkForNewWallpapersOnce();

  registerWindowsStartupOnce();

  setupAutoUpdater();

  const isStartupLaunch =
    process.platform === "win32" && app.getLoginItemSettings().wasOpenedAtLogin;

  if (!isStartupLaunch) {
    createMainWindow();
    broadcastUpdateState();
  }

  startSlideshow();
});

ipcMain.handle("updater:get-state", () => {
  return getUpdateStateSnapshot();
});

ipcMain.handle("updater:check", () => {
  checkForUpdates({ userInitiated: true });
  return getUpdateStateSnapshot();
});

ipcMain.handle("updater:download", async () => {
  if (!app.isPackaged || process.platform !== "win32") return getUpdateStateSnapshot();
  // Always open the latest installer in the user's browser (direct .exe download).
  const openedUrl = await openLatestInstallerDownloadInBrowser();
  return { ...getUpdateStateSnapshot(), openedUrl };
});

ipcMain.handle("updater:install", () => {
  if (!app.isPackaged || process.platform !== "win32") return { ok: false };
  if (!updateState.downloaded) return { ok: false };
  try {
    autoUpdater.quitAndInstall();
    return { ok: true };
  } catch (err) {
    console.error("Failed to install update:", err);
    return { ok: false };
  }
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

ipcMain.handle("toggle-slideshow", (event, state) => {
  settings.slideshow = state;
  saveSettings(settings);
  startSlideshow();
});

ipcMain.handle("toggle-random", (event, state) => {
  settings.slideshowRandom = state;
  saveSettings(settings);
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

ipcMain.handle("get-wallpaper-count", () => {
  return { count: getImages().length };
});

ipcMain.handle("clear-local-wallpapers", async () => {
  const dir = config.WALLPAPER_DIR;
  let deletedCount = 0;

  try {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (!f.match(/\.(jpg|jpeg|png|webp)$/i)) continue;
        try {
          fs.unlinkSync(path.join(dir, f));
          deletedCount++;
        } catch (err) {
          console.error("Failed to delete local wallpaper:", f, err && err.message ? err.message : err);
        }
      }
    }

    // Reset local-only state so the app feels "fresh".
    settings.selectedImages = [];
    settings.activeWallpaper = "";
    settings.lastSyncCursor = "";
    settings.ignoredServerFiles = [];
    settings.lastSyncDate = Date.now();
    saveSettings(settings);

    if (mainWindow) mainWindow.webContents.send("sync-complete");
    return { success: true, deletedCount };
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error("clear-local-wallpapers error:", message);
    if (mainWindow) mainWindow.webContents.send("app-error", `Failed to clear local wallpapers: ${message}`);
    return { success: false, deletedCount, error: message };
  }
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

    // If the user deletes a server-synced wallpaper, remember it so we don't re-download on full sync.
    try {
      const userDir = config.WALLPAPER_DIR;
      if (absolutePath && typeof absolutePath === "string" && absolutePath.startsWith(userDir)) {
        const key = path.basename(absolutePath);
        if (!settings.ignoredServerFiles) settings.ignoredServerFiles = [];
        if (!settings.ignoredServerFiles.includes(key)) {
          settings.ignoredServerFiles.push(key);
          saveSettings(settings);
        }
      }
    } catch {
      // ignore
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
    settings.wallpaperChangesCount = (settings.wallpaperChangesCount || 0) + 1;
    saveSettings(settings);
    if (mainWindow) mainWindow.webContents.send("sync-complete");
    return { success: true };
  } catch (err) {
    console.error("set-wallpaper error:", err);
    if (mainWindow) mainWindow.webContents.send("app-error", "Failed to set desktop wallpaper. File might be invalid.");
    throw err; // Throw so the renderer knows it failed
  }
});

// Offline-First Metadata Cache Handlers
ipcMain.handle("get-local-metadata", () => {
  return loadLocalMetadata();
});

ipcMain.handle("create-category-local", (event, name) => {
  return createCategoryLocally(name);
});

ipcMain.handle("create-collection-local", (event, name, categoryId) => {
  return createCollectionLocally(name, categoryId);
});

ipcMain.handle("create-tag-local", (event, name) => {
  return createTagLocally(name);
});

ipcMain.handle("update-wallpaper-metadata-local", (event, hash, collectionId, tagIds) => {
  return updateWallpaperMetadataLocally(hash, collectionId, tagIds);
});

ipcMain.handle("sync-metadata-now", async () => {
  const syncConfig = getSyncConfig();
  return await syncMetadataWithServer(syncConfig.API_URL, syncConfig.SYNC_TOKEN);
});

ipcMain.handle("update-slideshow-source", (event, source) => {
  settings.slideshowSource = source;
  saveSettings(settings);
  startSlideshow();
  return { success: true };
});

ipcMain.handle("update-slideshow-order", (event, order) => {
  settings.slideshowOrder = order;
  saveSettings(settings);
  startSlideshow();
  return { success: true };
});

ipcMain.handle("submit-review", async (event, rating, comment, reviewerName) => {
  if (rating === 0) {
    settings.wallpaperChangesCount = 0;
    saveSettings(settings);
    return { success: true, dismissed: true };
  }
  const syncConfig = getSyncConfig();
  let cleanUrl = syncConfig.API_URL.endsWith("/") ? syncConfig.API_URL.slice(0, -1) : syncConfig.API_URL;
  if (cleanUrl.endsWith("/api/wallpapers")) {
    cleanUrl = cleanUrl.substring(0, cleanUrl.length - "/api/wallpapers".length);
  }
  if (cleanUrl.endsWith("/")) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  try {
    const res = await axios.post(`${cleanUrl}/api/reviews`, {
      rating: Number(rating),
      comment: String(comment || ""),
      reviewer_name: String(reviewerName || "Anonymous")
    });
    settings.alreadyReviewed = true;
    saveSettings(settings);
    return { success: true, data: res.data };
  } catch (err) {
    console.error("Failed to submit review:", err.message);
    return { success: false, error: err.message };
  }
});
