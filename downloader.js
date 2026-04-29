const fs = require("fs");
const path = require("path");
const axios = require("axios");

async function syncWallpapers(config) {
  if (!fs.existsSync(config.WALLPAPER_DIR)) {
    fs.mkdirSync(config.WALLPAPER_DIR, { recursive: true });
  }

  try {
    const headers = {};
    if (config.SYNC_TOKEN) {
      headers["x-sync-token"] = config.SYNC_TOKEN;
    }

    const response = await axios.get(config.API_URL, {
      headers,
      timeout: 30_000
    });
    const wallpapers = response.data.wallpapers || [];
    let latestFile = null;
    let downloadCount = 0;
    const serverFiles = wallpapers.map(wp => wp.name);

    for (let wp of wallpapers) {
      if (!wp.name.match(/\.(jpg|jpeg|png|webp)$/i)) continue;

      const destPath = path.join(config.WALLPAPER_DIR, wp.name);

      // Download if we don't already have it
      if (!fs.existsSync(destPath)) {
        console.log("Downloading from API:", wp.name);
        const imgRes = await axios({
          url: wp.url,
          method: "GET",
          responseType: "stream"
        });

        const writer = fs.createWriteStream(destPath);
        imgRes.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        latestFile = destPath;
        downloadCount++;
      }
    }

    return { latestFile, downloadCount, serverFiles };
  } catch (error) {
    const status = error?.response?.status;
    const statusText = error?.response?.statusText;
    const message =
      typeof status === "number"
        ? `HTTP ${status}${statusText ? ` ${statusText}` : ""}`
        : error?.message || "Unknown error";

    console.error("Error syncing wallpapers from API:", message);
    return { latestFile: null, downloadCount: 0, serverFiles: [], error: message };
  }
}

module.exports = { syncWallpapers };
