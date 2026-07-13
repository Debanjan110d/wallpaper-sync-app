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
  const data = loadLocalMetadata();
  const tempId = -Date.now();
  const slug = slugify(name);

  // Check for duplicate name
  const existing = data.categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing;

  const newCat = {
    id: tempId,
    name: name.trim(),
    slug,
    isLocalOnly: true,
  };

  data.categories.push(newCat);
  data.sync_queue.categories.push({
    action: "create",
    tempId,
    name: name.trim(),
  });

  saveLocalMetadata(data);
  return newCat;
}

function createCollectionLocally(name, categoryId) {
  const data = loadLocalMetadata();
  const tempId = -Date.now();
  const slug = slugify(name);

  // Check for duplicate name in category
  const existing = data.collections.find(
    (c) => c.name.toLowerCase() === name.toLowerCase() && c.category_id === Number(categoryId)
  );
  if (existing) return existing;

  const newCol = {
    id: tempId,
    category_id: Number(categoryId),
    name: name.trim(),
    slug,
    isLocalOnly: true,
  };

  data.collections.push(newCol);
  data.sync_queue.collections.push({
    action: "create",
    tempId,
    name: name.trim(),
    categoryId: Number(categoryId),
  });

  saveLocalMetadata(data);
  return newCol;
}

function createTagLocally(name) {
  const data = loadLocalMetadata();
  const tempId = -Date.now();
  const slug = slugify(name);

  const existing = data.tags.find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing;

  const newTag = {
    id: tempId,
    name: name.trim(),
    slug,
    isLocalOnly: true,
  };

  data.tags.push(newTag);
  data.sync_queue.tags.push({
    action: "create",
    tempId,
    name: name.trim(),
  });

  saveLocalMetadata(data);
  return newTag;
}

function updateWallpaperMetadataLocally(hash, collectionId, tagIds) {
  const data = loadLocalMetadata();
  
  const metadata = {
    collection_id: collectionId ? Number(collectionId) : null,
    tags: Array.isArray(tagIds) ? tagIds.map(Number) : [],
  };

  data.wallpaper_metadata[hash] = metadata;

  // Add or update in wallpapers queue
  const idx = data.sync_queue.wallpapers.findIndex((w) => w.hash === hash);
  if (idx > -1) {
    data.sync_queue.wallpapers[idx] = { hash, ...metadata };
  } else {
    data.sync_queue.wallpapers.push({ hash, ...metadata });
  }

  saveLocalMetadata(data);
  return metadata;
}

// Background Server Synchronization
async function syncMetadataWithServer(apiUrl, syncToken) {
  if (!apiUrl) {
    return { status: "offline", error: "Sync API URL not configured" };
  }

  const cleanUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
  
  const headers = {};
  if (syncToken) {
    headers["x-sync-token"] = syncToken;
  }

  // To bypass Next.js API admin_session validation for Electron sync:
  // Ensure Electron uses the SYNC_TOKEN in headers to auth. 
  // All Next.js API endpoints have been structured to allow read/write with valid x-sync-token too.

  const data = loadLocalMetadata();
  const catMapping = {}; // tempId -> serverId
  const colMapping = {}; // tempId -> serverId
  const tagMapping = {}; // tempId -> serverId

  try {
    // 1. Check server connectivity
    await axios.get(`${cleanUrl}/api/categories`, { headers, timeout: 5000 });
  } catch (err) {
    return { status: "offline", error: "Server unreachable: " + err.message };
  }

  try {
    // 2. Sync categories queue
    const pendingCats = [...data.sync_queue.categories];
    for (const cat of pendingCats) {
      try {
        const res = await axios.post(
          `${cleanUrl}/api/categories`,
          { name: cat.name },
          { headers }
        );
        if (res.data && res.data.category) {
          catMapping[cat.tempId] = res.data.category.id;
          // Remove from queue
          data.sync_queue.categories = data.sync_queue.categories.filter(
            (c) => c.tempId !== cat.tempId
          );
        }
      } catch (err) {
        console.error("Failed to sync category:", cat.name, err.message);
      }
    }

    // Resolve mapped category IDs locally and in the collections queue
    for (const [tempId, serverId] of Object.entries(catMapping)) {
      const numTempId = Number(tempId);
      // Update local categories list
      data.categories = data.categories.map((c) =>
        c.id === numTempId ? { ...c, id: serverId, isLocalOnly: false } : c
      );
      // Update local collections category_id reference
      data.collections = data.collections.map((col) =>
        col.category_id === numTempId ? { ...col, category_id: serverId } : col
      );
      // Update pending collections queue categoryId reference
      data.sync_queue.collections = data.sync_queue.collections.map((col) =>
        col.categoryId === numTempId ? { ...col, categoryId: serverId } : col
      );
    }

    // 3. Sync collections queue
    const pendingCols = [...data.sync_queue.collections];
    for (const col of pendingCols) {
      try {
        const res = await axios.post(
          `${cleanUrl}/api/collections`,
          { name: col.name, category_id: col.categoryId },
          { headers }
        );
        if (res.data && res.data.collection) {
          colMapping[col.tempId] = res.data.collection.id;
          // Remove from queue
          data.sync_queue.collections = data.sync_queue.collections.filter(
            (c) => c.tempId !== col.tempId
          );
        }
      } catch (err) {
        console.error("Failed to sync collection:", col.name, err.message);
      }
    }

    // Resolve mapped collection IDs in local metadata and wallpapers queue
    for (const [tempId, serverId] of Object.entries(colMapping)) {
      const numTempId = Number(tempId);
      // Update local collections list
      data.collections = data.collections.map((c) =>
        c.id === numTempId ? { ...c, id: serverId, isLocalOnly: false } : c
      );
      // Update wallpaper metadata collection_id reference
      for (const hash of Object.keys(data.wallpaper_metadata)) {
        if (data.wallpaper_metadata[hash].collection_id === numTempId) {
          data.wallpaper_metadata[hash].collection_id = serverId;
        }
      }
      // Update pending wallpapers queue collection_id reference
      data.sync_queue.wallpapers = data.sync_queue.wallpapers.map((w) =>
        w.collection_id === numTempId ? { ...w, collection_id: serverId } : w
      );
    }

    // 4. Sync tags queue
    const pendingTags = [...data.sync_queue.tags];
    for (const tag of pendingTags) {
      try {
        const res = await axios.post(
          `${cleanUrl}/api/tags`,
          { name: tag.name },
          { headers }
        );
        if (res.data && res.data.tag) {
          tagMapping[tag.tempId] = res.data.tag.id;
          // Remove from queue
          data.sync_queue.tags = data.sync_queue.tags.filter(
            (t) => t.tempId !== tag.tempId
          );
        }
      } catch (err) {
        console.error("Failed to sync tag:", tag.name, err.message);
      }
    }

    // Resolve mapped tag IDs in local metadata and wallpapers queue
    for (const [tempId, serverId] of Object.entries(tagMapping)) {
      const numTempId = Number(tempId);
      // Update local tags list
      data.tags = data.tags.map((t) =>
        t.id === numTempId ? { ...t, id: serverId, isLocalOnly: false } : t
      );
      // Update wallpaper metadata tags array
      for (const hash of Object.keys(data.wallpaper_metadata)) {
        if (data.wallpaper_metadata[hash].tags.includes(numTempId)) {
          data.wallpaper_metadata[hash].tags = data.wallpaper_metadata[hash].tags.map(
            (tid) => (tid === numTempId ? serverId : tid)
          );
        }
      }
      // Update pending wallpapers queue tags array
      data.sync_queue.wallpapers = data.sync_queue.wallpapers.map((w) =>
        w.tags.includes(numTempId)
          ? { ...w, tags: w.tags.map((tid) => (tid === numTempId ? serverId : tid)) }
          : w
      );
    }

    // Save mapping changes
    saveLocalMetadata(data);

    // 5. Sync wallpapers metadata updates
    const pendingWps = [...data.sync_queue.wallpapers];
    if (pendingWps.length > 0) {
      // Get the latest wallpaper database records from the server to resolve server UUIDs from file hashes.
      const wpListRes = await axios.get(`${cleanUrl}/api/wallpapers`, { headers });
      const serverWps = wpListRes.data.wallpapers || [];

      // Build hash -> serverId map
      const serverWpMap = {};
      for (const sWp of serverWps) {
        if (sWp.hash) {
          serverWpMap[sWp.hash] = sWp.id; // Server UUID
        }
      }

      const bulkItems = [];
      const syncedHashes = [];

      for (const wp of pendingWps) {
        const serverId = serverWpMap[wp.hash];
        if (serverId) {
          bulkItems.push({
            id: serverId,
            collection_id: wp.collection_id,
            tags: wp.tags,
          });
          syncedHashes.push(wp.hash);
        }
      }

      if (bulkItems.length > 0) {
        try {
          await axios.post(
            `${cleanUrl}/api/wallpapers/bulk-update`,
            { items: bulkItems },
            { headers }
          );
          // Remove successfully synced wallpapers from the queue
          data.sync_queue.wallpapers = data.sync_queue.wallpapers.filter(
            (w) => !syncedHashes.includes(w.hash)
          );
        } catch (err) {
          console.error("Bulk sync wallpapers failed:", err.message);
        }
      }
    }

    // 6. Pull server metadata to fully synchronize local tables
    const [srvCatsRes, srvColsRes, srvTagsRes, srvWpsRes] = await Promise.all([
      axios.get(`${cleanUrl}/api/categories`, { headers }),
      axios.get(`${cleanUrl}/api/collections`, { headers }),
      axios.get(`${cleanUrl}/api/tags`, { headers }),
      axios.get(`${cleanUrl}/api/wallpapers`, { headers }),
    ]);

    data.categories = srvCatsRes.data.categories || [];
    data.collections = srvColsRes.data.collections || [];
    data.tags = srvTagsRes.data.tags || [];

    // Sync any server wallpaper metadata down to the local cache
    const serverWallpapers = srvWpsRes.data.wallpapers || [];
    for (const sw of serverWallpapers) {
      if (sw.hash) {
        // If there's no local pending change for this hash, copy server values
        const inQueue = data.sync_queue.wallpapers.some((qw) => qw.hash === sw.hash);
        if (!inQueue) {
          data.wallpaper_metadata[sw.hash] = {
            collection_id: sw.collection_id ? Number(sw.collection_id) : null,
            tags: Array.isArray(sw.tags) ? sw.tags.map((t) => Number(t.id)) : [],
          };
        }
      }
    }

    saveLocalMetadata(data);
    
    const totalQueued =
      data.sync_queue.categories.length +
      data.sync_queue.collections.length +
      data.sync_queue.tags.length +
      data.sync_queue.wallpapers.length;

    return {
      status: totalQueued > 0 ? "offline-pending" : "connected",
      categoriesCount: data.categories.length,
      collectionsCount: data.collections.length,
      tagsCount: data.tags.length,
    };
  } catch (err) {
    console.error("Error during sync runner:", err);
    return { status: "offline", error: err.message };
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
