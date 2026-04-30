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

  return {
    slideshow: false,
    slideshowInterval: 10000,
    lastSyncDate: Date.now(),
    selectedImages: [],
    apiUrl: "",
    syncToken: "",
    ...savedSettings
  };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing settings:", err);
  }
}

module.exports = { loadSettings, saveSettings };
