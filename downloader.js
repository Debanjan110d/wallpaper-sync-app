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

    const ignored = new Set(
      Array.isArray(config.IGNORED_SERVER_FILES)
        ? config.IGNORED_SERVER_FILES.map(String)
        : []
    );

    const apiUrl = new URL(config.API_URL);
    const fullSync = !!config.FULL_SYNC;
    const since = !fullSync && config.LAST_SYNC_CURSOR ? String(config.LAST_SYNC_CURSOR).trim() : "";
    if (since) {
      apiUrl.searchParams.set("since", since);
    }

    const response = await axios.get(apiUrl.toString(), {
      headers,
      timeout: 30_000
    });
    const wallpapers = response.data.wallpapers || [];

    const maxCreatedAt = response.data.max_created_at || null;

    const eligible = wallpapers
      .map((wp) => {
        const key = wp?.storage_path || wp?.name;
        return { ...wp, __key: key };
      })
      .filter((wp) => wp?.__key && String(wp.__key).match(/\.(jpg|jpeg|png|webp)$/i))
      .filter((wp) => !ignored.has(String(wp.__key)));

    const total = eligible.length;
    if (typeof onProgress === "function") {
      try {
        onProgress(0);
      } catch { }
    }

    let latestFile = null;
    let downloadCount = 0;
    const serverFiles = wallpapers.map(wp => String(wp?.storage_path || wp?.name || "")).filter(Boolean);

    for (let index = 0; index < eligible.length; index++) {
      const wp = eligible[index];

      const fileKey = String(wp.__key);
      const filename = path.basename(fileKey);
      const destPath = path.join(config.WALLPAPER_DIR, filename);

      // Download if we don't already have it
      if (!fs.existsSync(destPath)) {
        console.log("Downloading from API:", filename);
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

        // Preserve server ordering: apply server created_at as local modified time (best-effort).
        try {
          const createdAt = wp.created_at ? new Date(wp.created_at) : null;
          if (createdAt && !Number.isNaN(createdAt.getTime())) {
            fs.utimesSync(destPath, new Date(), createdAt);
          }
        } catch { }

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

    return { latestFile, downloadCount, serverFiles, maxCreatedAt };
  } catch (error) {
    const status = error?.response?.status;
    const statusText = error?.response?.statusText;
    const message =
      typeof status === "number"
        ? `HTTP ${status}${statusText ? ` ${statusText}` : ""}`
        : error?.message || "Unknown error";

    console.error("Error syncing wallpapers from API:", message);
    return { latestFile: null, downloadCount: 0, serverFiles: [], maxCreatedAt: null, error: message };
  }
}

module.exports = { syncWallpapers };
