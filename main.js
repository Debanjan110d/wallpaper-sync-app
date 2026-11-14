const { app, Tray, Menu, Notification, BrowserWindow, ipcMain, dialog, shell } = require("electron");

// Ensure a single running instance at startup
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  app.exit(0);
}

// Windows Toast Notification & Action Center Registration (AUMID)
// Windows requires a matching AppUserModelID so toast notifications work reliably in both packaged and dev environments
const APP_ID = "com.wallpaper.syncapp";
if (process.platform === "win32") {
  try {
    app.setAppUserModelId(app.isPackaged ? APP_ID : process.execPath);
  } catch (err) {
    console.warn("Failed to set appUserModelId:", err);
  }
}

// High-efficiency memory optimizations: limit heap growth & trim background renderer bloat
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=128");
app.commandLine.appendSwitch("disable-site-isolation-trials");
app.commandLine.appendSwitch("disable-features", "TranslateUI");

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
    // "Unable to move/create cache" (0x5) on Windows. As long as the temp dir is writable, this should succeed even in restrictive environments.
    const desiredCache = path.join(os.tmpdir(), "wallpaper-sync-cache", String(process.pid));

    if (desiredUserData && desiredUserData !== oldUserData) {
      app.setPath("userData", desiredUserData);
    }

    try {
      if (desiredCache) app.setPath("cache", desiredCache);
    } catch {
      // ignore
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

async function migrateUserDataIfNeeded() {
  try {
    const oldBase = USER_DATA_PATHS.oldUserData;
    const newBase = USER_DATA_PATHS.activeUserData;
    if (!oldBase || !newBase || oldBase === newBase) return;

    await fs.promises.mkdir(newBase, { recursive: true });

    const oldSettings = path.join(oldBase, "settings.json");
    const newSettings = path.join(newBase, "settings.json");
    if (fs.existsSync(oldSettings) && !fs.existsSync(newSettings)) {
      await fs.promises.copyFile(oldSettings, newSettings);
    }

    const oldWallpapers = path.join(oldBase, "wallpapers");
    const newWallpapers = path.join(newBase, "wallpapers");
    if (fs.existsSync(oldWallpapers) && !fs.existsSync(newWallpapers)) {
      await fs.promises.mkdir(newWallpapers, { recursive: true });
      const files = await fs.promises.readdir(oldWallpapers);
      for (const f of files) {
        try {
          await fs.promises.copyFile(path.join(oldWallpapers, f), path.join(newWallpapers, f));
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
const {
  initWatchdog,
  getWatchdogStatus,
  setWatchdogEnabled,
  verifyAndRecoverNow
} = require("./recoveryWatchdog");
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
    width: 1220,
    height: 820,
    minWidth: 860,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, "ui", "index.html"));
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });
  mainWindow.on("show", () => {
    if (mainWindow && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send("app:window-shown");
    }
  });

  let fullscreenSyncInterval = null;

  async function runFullscreenSync() {
    try {
      // Silently sync library and wallpapers in background when fullscreen
      await runFullLibrarySync(false, false);
    } catch (err) {
      console.error("Fullscreen auto-sync error:", err);
    }
  }

  mainWindow.on("enter-full-screen", () => {
    runFullscreenSync();
    if (fullscreenSyncInterval) clearInterval(fullscreenSyncInterval);
    fullscreenSyncInterval = setInterval(runFullscreenSync, 30000);
  });

  mainWindow.on("leave-full-screen", () => {
    if (fullscreenSyncInterval) {
      clearInterval(fullscreenSyncInterval);
      fullscreenSyncInterval = null;
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
    if (fullscreenSyncInterval) {
      clearInterval(fullscreenSyncInterval);
      fullscreenSyncInterval = null;
    }
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
      const full = path.join(sourceDir, f);
      let sizeBytes = 0;
      try { sizeBytes = fs.statSync(full).size || 0; } catch {}
      files.push({ filename: f, path: full, sizeBytes });
    });
  }
  if (fs.existsSync(userDir)) {
    const userFiles = fs
      .readdirSync(userDir)
      .filter((f) => f.match(/\.(jpg|jpeg|png|webp)$/i))
      .map((f) => {
        const full = path.join(userDir, f);
        let mtimeMs = 0;
        let sizeBytes = 0;
        try {
          const st = fs.statSync(full);
          mtimeMs = st.mtimeMs || 0;
          sizeBytes = st.size || 0;
        } catch {
          mtimeMs = 0;
          sizeBytes = 0;
        }
        return { filename: f, path: full, mtimeMs, sizeBytes };
      })
      .sort((a, b) => a.mtimeMs - b.mtimeMs);

    for (const f of userFiles) {
      if (!files.find((existing) => existing.filename === f.filename)) {
        files.push({ filename: f.filename, path: f.path, sizeBytes: f.sizeBytes });
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
    const favSet = new Set(
      (settings.selectedImages || []).map((p) => path.normalize(String(p)).toLowerCase())
    );
    images = images.filter((img) => {
      const norm = path.normalize(img.path).toLowerCase();
      const fn = img.filename.toLowerCase();
      return favSet.has(norm) || Array.from(favSet).some((f) => f.endsWith(fn));
    });
  } else if (source.type === "recent") {
    const count = Number(source.count) || 10;
    images = images
      .map((img) => {
        let mtimeMs = 0;
        try { mtimeMs = fs.statSync(img.path).mtimeMs; } catch {}
        return { ...img, mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, count);
  } else if (source.type === "collection" && source.id) {
    const metadata = loadLocalMetadata();
    const colId = Number(source.id);
    images = images.filter((img) => {
      const hash = path.basename(img.filename, path.extname(img.filename));
      const meta = metadata.wallpaper_metadata && metadata.wallpaper_metadata[hash];
      if (!meta) return false;
      const ids = Array.isArray(meta.collection_ids) ? meta.collection_ids : (meta.collection_id ? [meta.collection_id] : []);
      return ids.map(Number).includes(colId);
    });
  } else if (source.type === "category" && source.id) {
    const metadata = loadLocalMetadata();
    const catId = Number(source.id);
    const matchedCols = (metadata.collections || [])
      .filter((c) => Number(c.category_id) === catId)
      .map((c) => Number(c.id));
    images = images.filter((img) => {
      const hash = path.basename(img.filename, path.extname(img.filename));
      const meta = metadata.wallpaper_metadata && metadata.wallpaper_metadata[hash];
      if (!meta) return false;
      const ids = Array.isArray(meta.collection_ids) ? meta.collection_ids : (meta.collection_id ? [meta.collection_id] : []);
      return ids.some((cid) => matchedCols.includes(Number(cid)));
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
    await setWallpaper(image.path);
    settings.activeWallpaper = image.path;
    saveSettings(settings);
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Rotate active state in-place; do NOT broadcast sync-complete to avoid heavy re-scans!
      mainWindow.webContents.send("wallpaper:changed", { path: image.path, filename: image.filename });
    }
  } catch (err) {
    console.error("Slideshow error:", err.message);
    console.error("Full error:", err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("app-error", `Failed to set wallpaper: ${err.message}`);
    }
  }
}

function startSlideshow() {
  if (slideshowTimer) {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
  }
  if (settings.slideshow) {
    const rawInterval = Number(settings.slideshowInterval);
    const interval = (!isNaN(rawInterval) && rawInterval >= 5000) ? rawInterval : 1800000;
    slideshowTimer = setInterval(nextSlideshowImage, interval);
    console.log(`[Slideshow] Started timer loop with interval: ${interval} ms`);
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

// In-App Notification Center State
let inAppNotifications = [];

function broadcastInAppNotification(notifItem) {
  const existingIdx = inAppNotifications.findIndex(
    n => n.id === notifItem.id || (n.type === notifItem.type && n.type === "updates")
  );
  if (existingIdx !== -1) {
    inAppNotifications[existingIdx] = { ...inAppNotifications[existingIdx], ...notifItem };
  } else {
    inAppNotifications.unshift(notifItem);
  }
  if (inAppNotifications.length > 20) {
    inAppNotifications = inAppNotifications.slice(0, 20);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("notifications:update", inAppNotifications);
  }
}

// Native Windows Toast Notification Helper with user preference checks
function showNativeNotification({ title, body, icon, onClick, type = "general" }) {
  if (type === "wallpapers" && settings && settings.notifyNewWallpapers === false) return;
  if (type === "updates" && settings && settings.notifyAppUpdates === false) return;

  if (Notification.isSupported()) {
    try {
      const notifIcon = icon || path.join(__dirname, "icon.png");
      const notif = new Notification({
        title: title || "Wallpaper Sync",
        body: body || "",
        icon: fs.existsSync(notifIcon) ? notifIcon : undefined,
        silent: false,
      });

      const activateApp = () => {
        if (typeof onClick === "function") {
          try { onClick(); } catch {}
        }
        if (!mainWindow || mainWindow.isDestroyed()) {
          createMainWindow();
        } else {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      };

      notif.on("click", activateApp);
      notif.show();
    } catch (err) {
      console.warn("[main] Failed to display native toast notification:", err.message);
    }
  }
}

// Periodic Background Sync Timer
let autoSyncIntervalTimer = null;

function setupPeriodicAutoSync() {
  if (autoSyncIntervalTimer) {
    clearInterval(autoSyncIntervalTimer);
    autoSyncIntervalTimer = null;
  }

  // Periodic check interval (default: 6 hours, min: 15 mins)
  const intervalMs = Math.max(15 * 60 * 1000, Number(settings?.autoSyncInterval) || 21600000);

  autoSyncIntervalTimer = setInterval(async () => {
    if (settings?.autoSync) {
      console.log("[main] Scheduled background check: checking for new wallpapers & updates...");
      await checkCloudForNewWallpapers();
      await checkForUpdates({ userInitiated: false });
    }
  }, intervalMs);
}

// Check Cloud for New Wallpapers
async function checkCloudForNewWallpapers() {
  try {
    const syncConfig = getSyncConfig();
    const cursor = (syncConfig.LAST_SYNC_CURSOR || "").trim();

    const headers = {};
    if (syncConfig.SYNC_TOKEN) headers["x-sync-token"] = syncConfig.SYNC_TOKEN;

    const url = new URL(syncConfig.API_URL);
    if (cursor) {
      url.searchParams.set("since", cursor);
    }
    url.searchParams.set("countOnly", "1");

    const res = await axios.get(url.toString(), { headers, timeout: 15_000 });
    const count = Number(res?.data?.count || 0);
    if (!Number.isFinite(count) || count <= 0) return;

    if (settings?.autoSync) {
      console.log(`[main] Detected ${count} new wallpaper(s) in cloud. Automatically downloading...`);
      await runFullLibrarySync(false, false);
    } else {
      showNativeNotification({
        title: "New 4K Wallpapers Available",
        body: count === 1 ? "1 new 4K wallpaper is ready in the cloud." : `${count} new 4K wallpapers are ready in the cloud.`,
        type: "wallpapers",
        onClick: () => {
          createMainWindow();
        }
      });

      broadcastInAppNotification({
        id: "cloud-wallpapers-" + Date.now(),
        type: "wallpapers",
        title: "New Wallpapers in Cloud",
        body: `${count} new wallpaper(s) ready to download. Click 'Sync Library' to get them.`,
        time: "Just now",
        action: "sync-library"
      });
    }
  } catch (err) {
    // Silent fail on network glitches
  }
}

// Complete Unified 2-Stage Synchronization (Metadata + Wallpaper Images)
async function runFullLibrarySync(promptUser = false, notifyOnError = false) {
  try {
    const syncConfig = getSyncConfig();

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("sync:status", { phase: "metadata", message: "Synchronizing collections, tags & AI data..." });
    }

    // Stage 1: Synchronize Metadata Cache (Collections, Tags, AI Descriptions)
    let metaRes = null;
    try {
      metaRes = await syncMetadataWithServer(syncConfig.API_URL, syncConfig.SYNC_TOKEN, (status, percent) => {
        if (mainWindow && !mainWindow.webContents.isDestroyed()) {
          mainWindow.webContents.send("metadata-sync-progress", { status, percent });
        }
      });
    } catch (metaErr) {
      console.warn("[main] Metadata sync notice:", metaErr.message);
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("sync:status", { phase: "wallpapers", message: "Fetching and downloading 4K wallpapers..." });
      mainWindow.webContents.send("download-progress", 0);
    }

    // Stage 2: Synchronize and Download 4K Wallpaper Files
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
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("download-progress", percent);
        }
      }
    );

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("download-progress", 100);
    }

    if (error) {
      if (notifyOnError && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("app-error", `Sync encountered issues: ${error}`);
      }
      return { downloadCount: 0, serverDeletedCount: 0, error, metadataSynced: !!metaRes };
    }

    let serverDeletedCount = 0;
    if (fullSync && serverFiles && serverFiles.length > 0) {
      const localFiles = fs
        .readdirSync(config.WALLPAPER_DIR)
        .filter((f) => f.match(/\.(jpg|jpeg|png|webp)$/i));
      for (const local of localFiles) {
        if (!serverFiles.includes(local)) {
          serverDeletedCount++;
        }
      }
    }

    if (maxCreatedAt && typeof maxCreatedAt === "string") {
      const normalized = normalizeIsoTimestamp(maxCreatedAt);
      if (normalized) {
        settings.lastSyncCursor = normalized;
      }
    }

    settings.lastSyncDate = Date.now();
    saveSettings(settings);

    // Notify user if new wallpapers arrived
    if (downloadCount > 0) {
      showNativeNotification({
        title: "New 4K Wallpapers Synced",
        body: downloadCount === 1 ? "1 new wallpaper added to your collection." : `${downloadCount} new wallpapers added to your collection.`,
        type: "wallpapers",
        onClick: () => {
          createMainWindow();
        }
      });

      broadcastInAppNotification({
        id: "new-wallpapers-" + Date.now(),
        type: "wallpapers",
        title: "New Wallpapers Downloaded",
        body: `${downloadCount} new 4K wallpaper(s) synchronized to your local library.`,
        time: "Just now"
      });
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("sync-complete", { downloadCount, serverDeletedCount });
    }

    return { downloadCount, serverDeletedCount, error: null, metadataSynced: true };
  } catch (err) {
    console.error("[main] Full Library Sync Error:", err.message);
    const message = err && err.message ? err.message : String(err);
    if (notifyOnError && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("app-error", `Sync failed: ${message}`);
    }
    return { downloadCount: 0, serverDeletedCount: 0, error: message, metadataSynced: false };
  }
}

// Backward-compatible alias for auto-sync callers
async function runAutoSync(promptUser = false, notifyOnError = false) {
  return await runFullLibrarySync(promptUser, notifyOnError);
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

function compareSemver(v1, v2) {
  const p1 = String(v1 || "").replace(/^v/i, "").split(".").map(Number);
  const p2 = String(v2 || "").replace(/^v/i, "").split(".").map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

function getUpdateStateSnapshot() {
  return {
    supported: process.platform === "win32",
    available: !!updateState.available,
    downloaded: !!updateState.downloaded,
    version: updateState.version,
    notes: updateState.notes,
    checking: !!updateState.checking,
    downloading: !!updateState.downloading,
    currentVersion: app.getVersion()
  };
}

async function checkGithubReleasesDirectly({ userInitiated }) {
  try {
    const repo = getGithubRepoFromPackageJson() || { owner: "Debanjan110d", repo: "wallpaper-sync-app" };
    const apiUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`;
    const res = await axios.get(apiUrl, {
      timeout: 10_000,
      headers: {
        "User-Agent": "wallpaper-sync-app",
        "Accept": "application/vnd.github+json"
      }
    });

    const data = res && res.data ? res.data : null;
    const tag = data && data.tag_name ? String(data.tag_name) : "";
    const currentVersion = app.getVersion();

    if (tag && compareSemver(tag, currentVersion) > 0) {
      updateState.checking = false;
      updateState.available = true;
      updateState.version = tag.replace(/^v/i, "");
      updateState.notes = summarizeReleaseNotes(data.body);

      // Trigger native OS toast notification for new release
      showNativeNotification({
        title: `Wallpaper Sync v${updateState.version} Released`,
        body: `A new version is available! ${updateState.notes ? updateState.notes.slice(0, 90) + "..." : "Click to view and download."}`,
        type: "updates",
        onClick: () => {
          createMainWindow();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("app:open-update-modal");
          }
        }
      });

      // Broadcast to in-app notification center
      broadcastInAppNotification({
        id: "update-available-" + updateState.version,
        type: "updates",
        title: `Update v${updateState.version} Available`,
        body: `A new version of Wallpaper Sync is available. Click to download installer.`,
        time: "Just now",
        action: "download-update"
      });
    } else {
      updateState.checking = false;
      updateState.available = false;
      updateState.downloaded = false;
      updateState.version = currentVersion;
    }
  } catch (err) {
    console.error("Direct GitHub release check error:", err && err.message ? err.message : err);
    updateState.checking = false;
    updateState.available = false;
  } finally {
    refreshTrayMenu();
    broadcastUpdateState();
  }
}

async function checkForUpdates({ userInitiated }) {
  if (process.platform !== "win32") return;
  if (updateState.checking) return;

  updateState.checking = true;
  refreshTrayMenu();
  broadcastUpdateState();

  try {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates().catch(() => checkGithubReleasesDirectly({ userInitiated }));
    } else {
      await checkGithubReleasesDirectly({ userInitiated });
    }
  } catch (err) {
    await checkGithubReleasesDirectly({ userInitiated });
  }
}

if (gotSingleInstanceLock) app.whenReady().then(async () => {
  await migrateUserDataIfNeeded();
  settings = loadSettings();
  setupTray();

  // Initialize Recovery Watchdog service
  initWatchdog({
    getSettings: () => settings,
    saveSettings: (s) => saveSettings(s),
    setWallpaper: async (fp) => {
      await setWallpaper(fp);
      settings.activeWallpaper = fp;
      saveSettings(settings);
    },
    onRecovered: (evt) => {
      console.log("[main] Watchdog auto-recovered wallpaper:", evt);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("watchdog:recovered", evt);
        mainWindow.webContents.send("sync-complete");
      }
    }
  });

  // Initialize periodic background cloud check & update timer
  setupPeriodicAutoSync();

  // Cold launch wallpaper & update check
  if (settings.autoSync || settings.syncOnStartup) {
    setTimeout(() => {
      checkCloudForNewWallpapers();
    }, 2000);
  }

  setTimeout(() => {
    checkForUpdates({ userInitiated: false });
  }, 4000);

  registerWindowsStartupOnce();

  const isStartupLaunch =
    process.platform === "win32" && app.getLoginItemSettings().wasOpenedAtLogin;

  if (!isStartupLaunch) {
    createMainWindow();
    broadcastUpdateState();
  }

  startSlideshow();
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("updater:get-state", () => {
  return getUpdateStateSnapshot();
});

ipcMain.handle("updater:check", async () => {
  await checkForUpdates({ userInitiated: true });
  return getUpdateStateSnapshot();
});

ipcMain.handle("updater:download", async () => {
  if (process.platform !== "win32") return getUpdateStateSnapshot();
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

ipcMain.handle("save-connection-settings", (event, apiUrl, syncToken) => {
  settings.apiUrl = apiUrl;
  settings.syncToken = syncToken;
  saveSettings(settings);
  return { success: true };
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
  const parsed = Number(ms);
  settings.slideshowInterval = (!isNaN(parsed) && parsed >= 5000) ? parsed : 1800000;
  saveSettings(settings);
  startSlideshow();
  console.log(`[Slideshow] Interval updated to: ${settings.slideshowInterval} ms`);
  return { success: true, interval: settings.slideshowInterval };
});

ipcMain.handle("sync-now", async () => {
  const result = await runFullLibrarySync(false, true);
  await nextSlideshowImage();
  return result;
});

ipcMain.handle("fetch-server", async () => {
  return await runFullLibrarySync(true, true);
});

ipcMain.handle("sync-library-full", async (event, fullReconcile = false) => {
  return await runFullLibrarySync(fullReconcile, true);
});

ipcMain.handle("toggle-auto-sync", (event, enabled) => {
  settings.autoSync = !!enabled;
  saveSettings(settings);
  setupPeriodicAutoSync();
  return { success: true, autoSync: settings.autoSync };
});

ipcMain.handle("update-sync-interval", (event, intervalMs) => {
  const parsed = Number(intervalMs);
  if (!isNaN(parsed) && parsed >= 60000) {
    settings.autoSyncInterval = parsed;
    saveSettings(settings);
    setupPeriodicAutoSync();
  }
  return { success: true, autoSyncInterval: settings.autoSyncInterval };
});

ipcMain.handle("toggle-notify-wallpapers", (event, enabled) => {
  settings.notifyNewWallpapers = !!enabled;
  saveSettings(settings);
  return { success: true, notifyNewWallpapers: settings.notifyNewWallpapers };
});

ipcMain.handle("toggle-notify-updates", (event, enabled) => {
  settings.notifyAppUpdates = !!enabled;
  saveSettings(settings);
  return { success: true, notifyAppUpdates: settings.notifyAppUpdates };
});

ipcMain.handle("open-wallpaper-dir", () => {
  const dir = config.WALLPAPER_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  shell.openPath(dir);
  return { success: true, path: dir };
});

ipcMain.handle("get-wallpaper-dir", () => {
  return config.WALLPAPER_DIR;
});

ipcMain.handle("notifications:get", () => {
  return inAppNotifications;
});

ipcMain.handle("notifications:clear", () => {
  inAppNotifications = [];
  return { success: true };
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
  return await runFullLibrarySync(false, true);
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
    // User snoozed / ignored for later: remind after 10 days
    const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
    settings.reviewRemindAfter = Date.now() + TEN_DAYS_MS;
    settings.wallpaperChangesCount = 0;
    saveSettings(settings);
    return { success: true, dismissed: true, remindAfter: settings.reviewRemindAfter };
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

ipcMain.handle("is-packaged", () => {
  return app.isPackaged;
});

ipcMain.handle("app:trim-memory", async () => {
  try {
    if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      await mainWindow.webContents.session.clearCache();
      if (typeof global.gc === "function") global.gc();
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Recovery Watchdog IPC Handlers
ipcMain.handle("watchdog:get-status", () => {
  return getWatchdogStatus();
});

ipcMain.handle("watchdog:toggle", (event, enabled) => {
  return setWatchdogEnabled(enabled);
});

ipcMain.handle("watchdog:verify-now", async () => {
  return await verifyAndRecoverNow();
});

// System Health Check & Auto-Repair Engine
ipcMain.handle("app:health-check", async () => {
  const sourceDir = config.SOURCE_DIR;
  const userDir = config.WALLPAPER_DIR;
  let totalFiles = 0;
  let readableFiles = 0;
  let corruptedFiles = 0;
  let totalBytes = 0;
  const scannedPaths = new Set();
  const corruptedList = [];

  const checkDir = (dirPath) => {
    if (!dirPath || !fs.existsSync(dirPath)) return;
    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (!file.match(/\.(jpg|jpeg|png|webp|bmp)$/i)) continue;
        const fullPath = path.join(dirPath, file);
        if (scannedPaths.has(fullPath)) continue;
        scannedPaths.add(fullPath);
        totalFiles++;
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size >= 512) {
            readableFiles++;
            totalBytes += stats.size;
          } else {
            corruptedFiles++;
            corruptedList.push(fullPath);
          }
        } catch {
          corruptedFiles++;
          corruptedList.push(fullPath);
        }
      }
    } catch (err) {
      console.error("[HealthCheck] scan error for dir:", dirPath, err);
    }
  };

  checkDir(sourceDir);
  checkDir(userDir);

  const watchdogStatus = getWatchdogStatus();
  const hasActiveWp = !!(settings.activeWallpaper && fs.existsSync(settings.activeWallpaper));

  // Network Connectivity Check (ping API with timeout)
  let networkOnline = false;
  let pingMs = 0;
  try {
    const t0 = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(config.API_URL, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeoutId);
    pingMs = Date.now() - t0;
    networkOnline = resp.ok || resp.status < 500;
  } catch {
    networkOnline = false;
  }

  // Memory & Resource Usage
  const memUsage = process.memoryUsage();
  const memoryRssMB = Math.round((memUsage.rss / (1024 * 1024)) * 10) / 10;
  const heapUsedMB = Math.round((memUsage.heapUsed / (1024 * 1024)) * 10) / 10;

  // Auto-start at Windows login
  let autoStartEnabled = false;
  try {
    autoStartEnabled = !!app.getLoginItemSettings().openAtLogin;
  } catch {}

  // Compile issues & suggestions
  const issues = [];
  if (corruptedFiles > 0) {
    issues.push({
      id: "corrupted_files",
      severity: "warning",
      title: `${corruptedFiles} Damaged File(s) Detected`,
      description: "Found corrupted or zero-byte image files that cannot be decoded.",
      actionLabel: "Clean Corrupted Files"
    });
  }
  if (!hasActiveWp && totalFiles > 0) {
    issues.push({
      id: "active_wallpaper_missing",
      severity: "critical",
      title: "Active Wallpaper Unset or Missing",
      description: "The currently designated desktop wallpaper does not exist on disk.",
      actionLabel: "Reapply Default Wallpaper"
    });
  }
  if (!watchdogStatus.enabled) {
    issues.push({
      id: "watchdog_disabled",
      severity: "info",
      title: "Recovery Watchdog Inactive",
      description: "Watchdog is disabled; wallpapers won't auto-restore if overwritten by Windows.",
      actionLabel: "Enable Watchdog"
    });
  }
  if (!networkOnline) {
    issues.push({
      id: "cloud_offline",
      severity: "info",
      title: "Cloud Database Offline",
      description: "Cannot connect to the cloud catalog. Local wallpapers remain fully functional.",
      actionLabel: null
    });
  }

  const healthy = corruptedFiles === 0 && (totalFiles === 0 || hasActiveWp);

  return {
    healthy,
    totalFiles,
    readableFiles,
    corruptedFiles,
    diskUsageMB: Math.round((totalBytes / (1024 * 1024)) * 10) / 10,
    activeWallpaperValid: hasActiveWp,
    activeWallpaper: settings.activeWallpaper || "None",
    watchdogStatus,
    networkOnline,
    pingMs,
    memoryRssMB,
    heapUsedMB,
    autoStartEnabled,
    issues,
    platform: process.platform,
    version: config.VERSION
  };
});

ipcMain.handle("app:health-fix", async (event, action) => {
  const results = { action, success: true, message: "" };
  try {
    if (action === "clean-corrupted" || action === "optimize-all") {
      const userDir = config.WALLPAPER_DIR;
      let removedCount = 0;
      if (fs.existsSync(userDir)) {
        for (const f of fs.readdirSync(userDir)) {
          if (!f.match(/\.(jpg|jpeg|png|webp|bmp)$/i)) continue;
          const fp = path.join(userDir, f);
          try {
            const st = fs.statSync(fp);
            if (st.size < 512) {
              fs.unlinkSync(fp);
              removedCount++;
            }
          } catch {
            try { fs.unlinkSync(fp); removedCount++; } catch {}
          }
        }
      }
      results.cleaned = removedCount;
    }

    if (action === "fix-active-wp" || action === "optimize-all") {
      const all = getImages();
      if (all.length > 0) {
        const target = all[0];
        await setDesktopWallpaper(target.path);
        settings.activeWallpaper = target.path;
        saveSettings(settings);
        results.newActive = target.path;
      }
    }

    if (action === "enable-watchdog" || action === "optimize-all") {
      setWatchdogEnabled(true);
      results.watchdogEnabled = true;
    }

    if (action === "enable-autostart" || action === "optimize-all") {
      try {
        app.setLoginItemSettings({ openAtLogin: true });
        results.autoStart = true;
      } catch {}
    }

    results.message = "System optimization complete.";
    return results;
  } catch (err) {
    console.error("[HealthFix] error:", err);
    return { action, success: false, message: err.message };
  }
});
