const fs = require("fs");
const path = require("path");
const axios = require("axios");

async function syncWallpapers(config, onProgress) {
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

    const eligible = wallpapers.filter((wp) => wp?.name && wp.name.match(/\.(jpg|jpeg|png|webp)$/i));
    const total = eligible.length;
    if (typeof onProgress === "function") {
      try {
        onProgress(0);
      } catch { }
    }

    let latestFile = null;
    let downloadCount = 0;
    const serverFiles = wallpapers.map(wp => wp.name);

    for (let index = 0; index < eligible.length; index++) {
      const wp = eligible[index];

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

      if (typeof onProgress === "function" && total > 0) {
        const percent = Math.round(((index + 1) / total) * 100);
        try {
          onProgress(percent);
        } catch { }
      }
    }

    if (typeof onProgress === "function") {
      try {
        onProgress(100);
      } catch { }
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
