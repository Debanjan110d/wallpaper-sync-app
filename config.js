const path = require("path");
const { app } = require("electron");

module.exports = {
  JSON_URL: "https://yourdomain.com/wallpapers.json",
  get WALLPAPER_DIR() { return path.join(app.getPath("userData"), "wallpapers"); },
  get SOURCE_DIR() { return app.isPackaged ? path.join(process.resourcesPath, "wall_img") : path.join(__dirname, "wall_img"); },
  NOTIFICATION_INTERVAL: 1000 * 60 * 60 * 24 * 30 // 30 days
};
