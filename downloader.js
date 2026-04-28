const fs = require("fs");
const path = require("path");
const { app } = require("electron");

async function syncWallpapers(config) {
  if (!fs.existsSync(config.WALLPAPER_DIR)) {
    fs.mkdirSync(config.WALLPAPER_DIR, { recursive: true });
  }

  const sourceDir = app.isPackaged 
    ? path.join(process.resourcesPath, "wall_img") 
    : path.join(__dirname, "wall_img");

  if (!fs.existsSync(sourceDir)) {
    console.log("No wall_img folder found for testing.");
    return null;
  }

  const files = fs.readdirSync(sourceDir);
  let latestFile = null;

  for (let fileName of files) {
    if (!fileName.match(/\.(jpg|jpeg|png)$/i)) continue;

    const sourcePath = path.join(sourceDir, fileName);
    const destPath = path.join(config.WALLPAPER_DIR, fileName);

    if (!fs.existsSync(destPath)) {
      console.log("Mock downloading (copying):", fileName);
      fs.copyFileSync(sourcePath, destPath);
      latestFile = destPath;
      // Copy one file at a time to simulate fetching over intervals
      break;
    }
  }

  return latestFile;
}

module.exports = { syncWallpapers };
