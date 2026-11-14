const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const stream = require("stream");
const { promisify } = require("util");
const axios = require("axios");

const finishedStream = promisify(stream.finished);

// High-performance Connection Pooling with Keep-Alive Agents
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 5,
  maxFreeSockets: 5,
  timeout: 60_000,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 5,
  maxFreeSockets: 5,
  timeout: 60_000,
});

const downloadClient = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 45_000,
});

/**
 * Worker Pool pattern for bounded concurrency without overloading memory or socket descriptors.
 */
async function concurrentPool(items, concurrencyLimit, taskHandler) {
  let index = 0;
  const results = new Array(items.length);

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      try {
        results[currentIndex] = await taskHandler(item, currentIndex);
      } catch (err) {
        results[currentIndex] = { error: err };
      }
    }
  }

  const workerCount = Math.min(concurrencyLimit, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

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

    const response = await downloadClient.get(apiUrl.toString(), {
      headers,
      timeout: 30_000
    });
    const wallpapers = response.data?.wallpapers || [];
    const maxCreatedAt = response.data?.max_created_at || null;

    const eligible = wallpapers
      .map((wp) => {
        const key = wp?.storage_path || wp?.name;
        return { ...wp, __key: key };
      })
      .filter((wp) => wp?.__key && String(wp.__key).match(/\.(jpg|jpeg|png|webp)$/i))
      .filter((wp) => !ignored.has(String(wp.__key)))
      .filter((wp) => !!wp?.url);

    // Sort descending by created_at to preserve proper sync cursor tracking
    eligible.sort((a, b) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tB - tA;
    });

    const total = eligible.length;
    if (typeof onProgress === "function") {
      try {
        onProgress(0);
      } catch { }
    }

    let latestFile = null;
    let downloadCount = 0;
    const serverFiles = wallpapers.map(wp => String(wp?.storage_path || wp?.name || "")).filter(Boolean);
    const failedIndices = new Set();
    const downloadErrors = [];
    let completedCount = 0;

    // Concurrency limit: 3 parallel downloads optimal for 4K images on standard home broadband
    const CONCURRENCY_LIMIT = 3;

    await concurrentPool(eligible, CONCURRENCY_LIMIT, async (wp, index) => {
      const fileKey = String(wp.__key);
      const filename = path.basename(fileKey);
      const destPath = path.join(config.WALLPAPER_DIR, filename);

      // Check if existing file is corrupted (0 bytes) and clean it up
      let isGlitched = false;
      if (fs.existsSync(destPath)) {
        try {
          const stats = fs.statSync(destPath);
          if (stats.size === 0) {
            isGlitched = true;
          }
        } catch {
          isGlitched = true;
        }
      }

      if (isGlitched) {
        try {
          fs.unlinkSync(destPath);
          console.log("[Downloader] Removed corrupted 0-byte wallpaper:", filename);
        } catch (err) {
          console.warn("[Downloader] Failed to remove 0-byte file:", filename, err.message);
        }
      }

      // Only download if we don't already have it
      if (!fs.existsSync(destPath)) {
        console.log(`[Downloader] Fetching 4K wallpaper [${index + 1}/${total}]:`, filename);
        const tempPath = destPath + ".tmp";

        // Clean stale temp file
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        } catch { }

        let writer = null;
        try {
          const imgRes = await downloadClient({
            url: wp.url,
            method: "GET",
            responseType: "stream",
            timeout: 60_000,
          });

          writer = fs.createWriteStream(tempPath);
          imgRes.data.pipe(writer);

          // Wait until fully flushed and written to disk
          await finishedStream(writer);

          // Atomic rename from temp to destination
          fs.renameSync(tempPath, destPath);

          // Apply server created_at as local modified time
          try {
            const createdAt = wp.created_at ? new Date(wp.created_at) : null;
            if (createdAt && !Number.isNaN(createdAt.getTime())) {
              fs.utimesSync(destPath, new Date(), createdAt);
            }
          } catch { }

          latestFile = destPath;
          downloadCount++;

          // Generate lightweight thumbnail for high-efficiency grid rendering
          try {
            const thumbDir = config.THUMBNAIL_DIR || path.join(path.dirname(destPath), "..", "thumbnails");
            if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
            const thumbPath = path.join(thumbDir, `thumb_${filename}`);
            if (!fs.existsSync(thumbPath)) {
              const { nativeImage } = require("electron");
              const img = nativeImage.createFromPath(destPath);
              if (!img.isEmpty()) {
                const resized = img.resize({ width: 380, quality: "good" });
                fs.writeFileSync(thumbPath, resized.toJPEG(75));
              }
            }
          } catch { }
        } catch (err) {
          console.warn(`[Downloader] Skipped unavailable wallpaper "${filename}":`, err.message);
          failedIndices.add(index);
          downloadErrors.push(`${filename}: ${err.message}`);

          if (writer && !writer.destroyed) {
            writer.destroy();
          }
          try {
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath);
            }
          } catch { }
        }
      }

      completedCount++;
      if (typeof onProgress === "function" && total > 0) {
        const percent = Math.round((completedCount / total) * 100);
        try {
          onProgress(percent);
        } catch { }
      }
    });

    if (typeof onProgress === "function") {
      try {
        onProgress(100);
      } catch { }
    }

    // Safely calculate nextSyncCursor: do not advance past the oldest failed download
    let safeMaxCreatedAt = maxCreatedAt;
    if (failedIndices.size > 0) {
      const oldestFailedIdx = Math.max(...failedIndices);
      if (oldestFailedIdx + 1 < eligible.length) {
        safeMaxCreatedAt = eligible[oldestFailedIdx + 1].created_at || null;
      } else {
        safeMaxCreatedAt = config.LAST_SYNC_CURSOR || null;
      }
    }

    let finalError = null;
    if (downloadErrors.length > 0) {
      finalError = `Failed to download ${downloadErrors.length} file(s): ${downloadErrors.join("; ")}`;
    }

    return { latestFile, downloadCount, serverFiles, maxCreatedAt: safeMaxCreatedAt, error: finalError };
  } catch (error) {
    const status = error?.response?.status;
    const statusText = error?.response?.statusText;
    const message =
      typeof status === "number"
        ? `HTTP ${status}${statusText ? ` ${statusText}` : ""}`
        : error?.message || "Unknown error";

    console.error("[Downloader] Error syncing wallpapers from API:", message);
    return { latestFile: null, downloadCount: 0, serverFiles: [], maxCreatedAt: null, error: message };
  }
}

module.exports = { syncWallpapers };
