const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const axios = require("axios");

function getMetadataPath() {
  return path.join(app.getPath("userData"), "local_metadata.json");
}

function loadLocalMetadata() {
  const metadataPath = getMetadataPath();
  const defaultMetadata = {
    etag: "",
    categories: [],
    collections: [],
    tags: [],
    wallpaper_metadata: {}, // hash -> { collection_id, tags: [] }
    sync_queue: {
      categories: [],
      collections: [],
      tags: [],
      wallpapers: [], // { hash, collection_id, tags: [] }
    },
  };

  if (!fs.existsSync(metadataPath)) {
    try {
      fs.writeFileSync(metadataPath, JSON.stringify(defaultMetadata, null, 2), "utf-8");
      return defaultMetadata;
    } catch (err) {
      console.error("Failed to write initial metadata:", err);
      return defaultMetadata;
    }
  }

  try {
    const content = fs.readFileSync(metadataPath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading local metadata:", err);
    return defaultMetadata;
  }
}

function saveLocalMetadata(data) {
  try {
    fs.writeFileSync(getMetadataPath(), JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error saving local metadata:", err);
    return false;
  }
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

// Local CRUD Operations
function createCategoryLocally(name) {
  // Read-only: CRUD updates are disabled on the client.
  return { id: -1, name: name.trim(), slug: "", isLocalOnly: true };
}

function createCollectionLocally(name, categoryId) {
  // Read-only: CRUD updates are disabled on the client.
  return { id: -1, category_id: Number(categoryId), name: name.trim(), slug: "", isLocalOnly: true };
}

function createTagLocally(name) {
  // Read-only: CRUD updates are disabled on the client.
  return { id: -1, name: name.trim(), slug: "", isLocalOnly: true };
}

function updateWallpaperMetadataLocally(hash, collectionId, tagIds) {
  // Read-only: CRUD updates are disabled on the client.
  return {
    collection_id: collectionId ? Number(collectionId) : null,
    tags: Array.isArray(tagIds) ? tagIds.map(Number) : [],
  };
}

// Background Server Synchronization (One-Directional: Server -> Client Cache)
async function syncMetadataWithServer(apiUrl, syncToken, onProgress) {
  const reportProgress = (status, percent) => {
    if (typeof onProgress === "function") {
      try {
        onProgress(status, percent);
      } catch (err) {
        console.error("Progress report error:", err);
      }
    }
  };

  if (!apiUrl) {
    reportProgress("Sync API URL not configured", 0);
    return { status: "offline", error: "Sync API URL not configured" };
  }

  let cleanUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
  if (cleanUrl.endsWith("/api/wallpapers")) {
    cleanUrl = cleanUrl.substring(0, cleanUrl.length - "/api/wallpapers".length);
  }
  if (cleanUrl.endsWith("/")) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  
  const headers = {};
  if (syncToken) {
    headers["x-sync-token"] = syncToken;
  }

  const data = loadLocalMetadata();

  try {
    // 1. Fast Connectivity Probe (short timeout so app never blocks or hangs)
    reportProgress("Checking server connection...", 10);
    await axios.get(`${cleanUrl}/api/collections`, { headers, timeout: 3500 });
  } catch (err) {
    reportProgress("Server offline - using cached metadata", 100);
    console.log(`[MetadataCache] Server unreachable (${err.code || err.message}) - working offline with cached collections.`);
    return { status: "offline", error: err.message, usingCached: true };
  }

  try {
    // 2. Pull server metadata with strict timeouts to prevent hangs or unhandled ECONNRESET
    reportProgress("Fetching latest library data...", 50);
    const wpsHeaders = { ...headers };
    if (data.etag) {
      wpsHeaders["if-none-match"] = data.etag;
    }

    const [srvColsRes, srvTagsRes, srvWpsRes] = await Promise.all([
      axios.get(`${cleanUrl}/api/collections`, { headers, timeout: 5000 }),
      axios.get(`${cleanUrl}/api/tags`, { headers, timeout: 5000 }),
      axios.get(`${cleanUrl}/api/wallpapers`, { 
        headers: wpsHeaders,
        timeout: 6000,
        validateStatus: (status) => status === 200 || status === 304
      }),
    ]);

    // Update local collections & tags if server returned valid arrays
    if (Array.isArray(srvColsRes.data?.collections)) {
      data.collections = srvColsRes.data.collections;
    }
    if (Array.isArray(srvTagsRes.data?.tags)) {
      data.tags = srvTagsRes.data.tags;
    }
    data.categories = [];

    if (srvWpsRes.status === 200 && Array.isArray(srvWpsRes.data?.wallpapers)) {
      // Intelligently merge server wallpaper metadata without wiping local orientations
      if (!data.wallpaper_metadata) data.wallpaper_metadata = {};
      const serverWallpapers = srvWpsRes.data.wallpapers || [];
      for (const sw of serverWallpapers) {
        if (sw.hash) {
          const existing = data.wallpaper_metadata[sw.hash] || {};
          data.wallpaper_metadata[sw.hash] = {
            ...existing,
            file_name: sw.file_name || existing.file_name || null,
            created_at: sw.created_at || existing.created_at || null,
            collection_id: sw.collection_id ? Number(sw.collection_id) : existing.collection_id,
            collection_ids: Array.isArray(sw.collections)
              ? sw.collections.map((c) => Number(c.id))
              : (sw.collection_id ? [Number(sw.collection_id)] : (existing.collection_ids || [])),
            tags: Array.isArray(sw.tags) ? sw.tags.map((t) => Number(t.id)) : (existing.tags || []),
            title: sw.title || existing.title || null,
            description: sw.description || existing.description || null,
            orientation: existing.orientation || sw.orientation || null,
            quality: sw.quality || existing.quality || null,
          };
        }
      }
      data.etag = srvWpsRes.headers["etag"] || srvWpsRes.headers["ETag"] || "";
      console.log("Database metadata updated to version:", data.etag);
    } else {
      console.log("Database metadata unchanged (304 Not Modified), using cached metadata.");
    }

    // Reset local sync queue structure so we don't carry any stale state
    data.sync_queue = {
      categories: [],
      collections: [],
      tags: [],
      wallpapers: [],
    };

    saveLocalMetadata(data);
    reportProgress("Metadata sync complete!", 100);

    return {
      status: "connected",
      categoriesCount: data.categories.length,
      collectionsCount: data.collections.length,
      tagsCount: data.tags.length,
    };
  } catch (err) {
    const isNetworkError = err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.code === "ENOTFOUND" || err.message?.includes("timeout");
    if (isNetworkError) {
      console.log(`[MetadataCache] Sync paused due to network (${err.code || err.message}) - preserving offline metadata cache.`);
    } else {
      console.warn("[MetadataCache] Notice during sync runner:", err.message);
    }
    reportProgress("Using cached metadata", 100);
    return { status: "offline", error: err.message, usingCached: true };
  }
}

module.exports = {
  loadLocalMetadata,
  saveLocalMetadata,
  createCategoryLocally,
  createCollectionLocally,
  createTagLocally,
  updateWallpaperMetadataLocally,
  syncMetadataWithServer,
};
