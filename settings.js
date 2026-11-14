const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadSettings() {
  const settingsPath = getSettingsPath();
  let savedSettings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      const data = fs.readFileSync(settingsPath, "utf-8");
      savedSettings = JSON.parse(data);
    } catch (err) {
      console.error("Error reading settings:", err);
    }
  }

  const now = Date.now();
  const firstUsedAt = savedSettings.firstUsedAt || now;

  const merged = {
    // When enabled, the app automatically checks and syncs wallpapers in the background
    autoSync: true,
    autoSyncInterval: 21600000, // 6 hours (6 * 60 * 60 * 1000)
    syncOnStartup: true,
    notifyNewWallpapers: true,
    notifyAppUpdates: true,
    slideshow: false,
    slideshowRandom: false,
    slideshowInterval: 1800000,
    lastSyncDate: now,
    // ISO timestamp of the newest wallpaper we've seen from the server (db created_at).
    lastSyncCursor: "",
    // Storage file keys (e.g. '<hash>.jpg') that this device should never re-download.
    ignoredServerFiles: [],
    selectedImages: [],
    apiUrl: "",
    syncToken: "",
    appVersion: "5.1.0",
    alreadyReviewed: false,
    firstUsedAt,
    reviewRemindAfter: 0,
    recoveryWatchdog: true,
    ...savedSettings,
    firstUsedAt
  };

  if (!savedSettings.firstUsedAt) {
    saveSettings(merged);
  }

  return merged;
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing settings:", err);
  }
}

module.exports = { loadSettings, saveSettings };
