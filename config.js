const path = require("path");
const { app } = require("electron");

module.exports = {
  get API_URL() {
    return process.env.WALLPAPER_SYNC_API_URL
      || "https://wallpaper-sync-app.vercel.app/api/wallpapers";
  },
  get SYNC_TOKEN() { return process.env.WALLPAPER_SYNC_TOKEN || ""; },
  get WALLPAPER_DIR() { return path.join(app.getPath("userData"), "wallpapers"); },
  get SOURCE_DIR() { return app.isPackaged ? path.join(process.resourcesPath, "wall_img") : path.join(__dirname, "wall_img"); },
  NOTIFICATION_INTERVAL: 1000 * 60 * 60 * 24 * 30 // 30 days
};
