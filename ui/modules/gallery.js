// Gallery lists, grids, filter UI and lightbox viewer components
import { store } from "../store.js";
import { toFileUrl, fuzzyMatch, showToast, updateNavButtonsVisibility } from "./utils.js";
import { openDetailDrawer } from "./drawer.js";

// 1. Populate Category, Collection, and Tag filters
export function populateFiltersAndDropdowns() {
    const colFilter = document.getElementById("colFilter");
    const tagFilter = document.getElementById("tagFilter");
    if (!colFilter || !tagFilter) return;

    const activeColFilter = colFilter.value;
    const activeTagFilter = tagFilter.value;

    // Clear dropdown filters
    colFilter.innerHTML = '<option value="">All Collections</option>';
    tagFilter.innerHTML = '<option value="">All Tags</option>';

    const localMetadata = store.state.localMetadata;

    // Populate tags
    localMetadata.tags.forEach(tag => {
        tagFilter.innerHTML += `<option value="${tag.id}">${tag.name}</option>`;
    });

    // Restore selections
    tagFilter.value = activeTagFilter;

    // Populate collections
    updateCollectionsDropdowns(activeColFilter);
}

export function updateCollectionsDropdowns(selectedColFilterId = "") {
    const colFilter = document.getElementById("colFilter");
    if (!colFilter) return;

    colFilter.innerHTML = '<option value="">All Collections</option>';
    colFilter.disabled = false;

    store.state.localMetadata.collections.forEach(col => {
        colFilter.innerHTML += `<option value="${col.id}">${col.name}</option>`;
    });

    colFilter.value = selectedColFilterId;
}

// 2. Render Collections Horizontal Section
export function renderCategorySection() {
    const grid = document.getElementById("categoriesGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const localMetadata = store.state.localMetadata;
    const currentImages = store.state.currentImages || [];

    if (localMetadata.collections.length === 0) {
        grid.innerHTML = '<span style="color:var(--text-muted); font-size:12px; padding:10px;">No collections created yet</span>';
        return;
    }

    const colMap = {};
    localMetadata.collections.forEach(col => {
        colMap[col.id] = { name: col.name, count: 0, cover: "" };
    });

    currentImages.forEach(img => {
        const hash = img.filename.split(".")[0];
        const meta = localMetadata.wallpaper_metadata[hash] || {};
        const collectionIds = Array.isArray(meta.collection_ids)
            ? meta.collection_ids
            : (meta.collection_id ? [meta.collection_id] : []);

        collectionIds.forEach(colId => {
            if (colMap[colId]) {
                colMap[colId].count++;
                if (!colMap[colId].cover) {
                    colMap[colId].cover = toFileUrl(img.path);
                }
            }
        });
    });

    localMetadata.collections.forEach(col => {
        const stats = colMap[col.id] || { name: col.name, count: 0, cover: "" };

        const card = document.createElement("div");
        card.className = "category-card";

        const colors = ["#2b5c8f", "#126e51", "#8f3b2b", "#772b8f", "#8f7c2b", "#1a73e8"];
        const color = colors[Math.abs(col.name.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];

        if (stats.cover) {
            card.style.backgroundImage = `url('${stats.cover}')`;
            card.style.backgroundSize = "cover";
            card.style.backgroundPosition = "center";
        } else {
            card.style.backgroundColor = color;
        }

        card.innerHTML = `
            <div class="category-card-overlay" style="background: linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.75));">
                <span class="category-card-title">${col.name}</span>
                <span class="category-card-subtitle">${stats.count} wallpapers</span>
            </div>
        `;

        card.addEventListener("click", () => {
            if (colFilter) {
                colFilter.value = col.id;
                colFilter.dispatchEvent(new Event("change"));
                document.getElementById("catalogFilterSection")?.scrollIntoView({ behavior: "smooth" });
            }
        });

        grid.appendChild(card);
    });
}

// 3. Render Recently Added horizontal row
export function renderRecentlyAdded() {
    const container = document.getElementById("recentlyAddedRow");
    if (!container) return;
    container.innerHTML = "";

    const currentImages = store.state.currentImages || [];
    const localMetadata = store.state.localMetadata;

    if (currentImages.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted); font-size:12px; padding:10px;">No wallpapers loaded</span>';
        return;
    }

    const list = currentImages.slice(-6).reverse();
    list.forEach(img => {
        const hash = img.filename.split(".")[0];
        const meta = localMetadata.wallpaper_metadata[hash] || {};
        const collectionIds = Array.isArray(meta.collection_ids) ? meta.collection_ids : (meta.collection_id ? [meta.collection_id] : []);
        const matchedCols = localMetadata.collections.filter(c => collectionIds.includes(Number(c.id)));
        const colNames = matchedCols.map(c => c.name).join(", ") || "None";

        const friendlyName = colNames && colNames !== "None" ? colNames : img.filename.split(".")[0];
        const wtags = meta.tags ? localMetadata.tags.filter(t => meta.tags.includes(t.id)) : [];
        const tagString = wtags.slice(0, 3).map(t => `#${t.name}`).join(" ");
        const extraCount = wtags.length - 3;
        const displayName = tagString + (extraCount > 0 ? ` +${extraCount}` : "");

        const card = document.createElement("div");
        card.className = "horizontal-card";
        card.title = img.filename;
        card.innerHTML = `
            <img src="${toFileUrl(img.path)}" class="horizontal-card-img" alt="${img.filename}" draggable="false" />
            <div class="horizontal-card-info">
                <div class="horizontal-card-title" style="margin-bottom: 2px;">${friendlyName}</div>
                <div class="horizontal-card-tags" style="font-size: 10px; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px;" title="${wtags.map(t => '#' + t.name).join(" ")}">${displayName || "No tags"}</div>
                <div class="horizontal-card-meta">
                    <span>${colNames}</span>
                </div>
            </div>
        `;

        card.addEventListener("click", () => openDetailDrawer(img));
        container.appendChild(card);
    });

    setTimeout(() => {
        updateNavButtonsVisibility(
            document.getElementById("recentlyAddedRow"),
            document.getElementById("recentlyAddedPrevBtn"),
            document.getElementById("recentlyAddedNextBtn")
        );
    }, 100);
}

// 4. Render Random Discoveries horizontal row
export function renderRandomDiscoveries() {
    const container = document.getElementById("randomRow");
    if (!container) return;
    container.innerHTML = "";

    const currentImages = store.state.currentImages || [];
    const localMetadata = store.state.localMetadata;

    if (currentImages.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted); font-size:12px; padding:10px;">No wallpapers loaded</span>';
        return;
    }

    const shuffled = [...currentImages].sort(() => 0.5 - Math.random());
    const list = shuffled.slice(0, 6);

    list.forEach(img => {
        const hash = img.filename.split(".")[0];
        const meta = localMetadata.wallpaper_metadata[hash] || {};
        const collectionIds = Array.isArray(meta.collection_ids) ? meta.collection_ids : (meta.collection_id ? [meta.collection_id] : []);
        const matchedCols = localMetadata.collections.filter(c => collectionIds.includes(Number(c.id)));
        const colNames = matchedCols.map(c => c.name).join(", ") || "None";

        const friendlyName = colNames && colNames !== "None" ? colNames : img.filename.split(".")[0];
        const wtags = meta.tags ? localMetadata.tags.filter(t => meta.tags.includes(t.id)) : [];
        const tagString = wtags.slice(0, 3).map(t => `#${t.name}`).join(" ");
        const extraCount = wtags.length - 3;
        const displayName = tagString + (extraCount > 0 ? ` +${extraCount}` : "");

        const card = document.createElement("div");
        card.className = "horizontal-card";
        card.title = img.filename;
        card.innerHTML = `
            <img src="${toFileUrl(img.path)}" class="horizontal-card-img" alt="${img.filename}" draggable="false" />
            <div class="horizontal-card-info">
                <div class="horizontal-card-title" style="margin-bottom: 2px;">${friendlyName}</div>
                <div class="horizontal-card-tags" style="font-size: 10px; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px;" title="${wtags.map(t => '#' + t.name).join(" ")}">${displayName || "No tags"}</div>
                <div class="horizontal-card-meta">
                    <span>${colNames}</span>
                </div>
            </div>
        `;

        card.addEventListener("click", () => openDetailDrawer(img));
        container.appendChild(card);
    });

    setTimeout(() => {
        updateNavButtonsVisibility(
            document.getElementById("randomRow"),
            document.getElementById("randomPrevBtn"),
            document.getElementById("randomNextBtn")
        );
    }, 100);
}

// 5. Explore Catalog Grid (with search filter logic)
export function renderCatalog() {
    const gallery = document.getElementById("gallery");
    if (!gallery) return;
    gallery.innerHTML = "";

    const globalSearchInput = document.getElementById("globalSearchInput");
    const colFilter = document.getElementById("colFilter");
    const tagFilter = document.getElementById("tagFilter");
    const headerBackBtn = document.getElementById("headerBackBtn");

    const query = globalSearchInput?.value.toLowerCase().trim() || "";
    const colFilterId = colFilter?.value || "";
    const tagFilterId = tagFilter?.value || "";

    const isSearching = !!query || !!colFilterId || !!tagFilterId;
    const sliderSect = document.getElementById("heroSliderSection");
    const addedSect = document.getElementById("recentlyAddedSection");
    const catSect = document.getElementById("categoriesSection");
    const randSect = document.getElementById("randomSection");

    if (sliderSect) sliderSect.style.display = isSearching ? "none" : "";
    if (addedSect) addedSect.style.display = isSearching ? "none" : "";
    if (catSect) catSect.style.display = isSearching ? "none" : "";
    if (randSect) randSect.style.display = isSearching ? "none" : "";

    if (headerBackBtn) {
        headerBackBtn.style.display = isSearching ? "inline-flex" : "none";
    }

    const catalogTitle = document.getElementById("catalogTitle");
    if (catalogTitle) {
        if (query) {
            catalogTitle.innerText = `Search Results for "${globalSearchInput.value.trim()}"`;
        } else if (colFilterId) {
            const col = store.state.localMetadata.collections.find(c => String(c.id) === String(colFilterId));
            catalogTitle.innerText = col ? `Collection: ${col.name}` : "Explore Wallpapers";
        } else if (tagFilterId) {
            const tag = store.state.localMetadata.tags.find(t => String(t.id) === String(tagFilterId));
            catalogTitle.innerText = tag ? `Tag: ${tag.name}` : "Explore Wallpapers";
        } else {
            catalogTitle.innerText = "Explore All Wallpapers";
        }
    }

    const filtered = (store.state.currentImages || []).filter(img => {
        const hash = img.filename.split(".")[0];
        const meta = store.state.localMetadata.wallpaper_metadata[hash] || {};
        const collectionIds = Array.isArray(meta.collection_ids) ? meta.collection_ids : (meta.collection_id ? [meta.collection_id] : []);
        const wtags = meta.tags ? store.state.localMetadata.tags.filter(t => meta.tags.includes(t.id)) : [];

        if (colFilterId && !collectionIds.some(id => String(id) === String(colFilterId))) {
            return false;
        }
        if (tagFilterId && (!meta.tags || !meta.tags.includes(Number(tagFilterId)))) {
            return false;
        }

        if (query) {
            const originalName = meta.file_name || img.filename;
            const inName = fuzzyMatch(originalName, query) || fuzzyMatch(img.filename, query);
            const matchedCols = store.state.localMetadata.collections.filter(c => collectionIds.includes(Number(c.id)));
            const inCol = matchedCols.some(c => fuzzyMatch(c.name, query));
            const inTags = wtags.some(t => fuzzyMatch(t.name, query));
            const inStyle = meta.style ? fuzzyMatch(meta.style, query) : false;
            const inColor = meta.primary_color ? fuzzyMatch(meta.primary_color, query) : false;
            const inQuality = meta.quality ? fuzzyMatch(meta.quality, query) : false;
            return inName || inCol || inTags || inStyle || inColor || inQuality;
        }

        return true;
    });

    if (filtered.length === 0) {
        gallery.innerHTML = '<span style="color:var(--text-muted); font-size:12px; grid-column: 1/-1; text-align:center; padding:40px;">No wallpapers match filters</span>';
        return;
    }

    filtered.forEach((imgData, index) => {
        const card = document.createElement("div");
        card.className = "wallpaper-card";
        if (store.state.isManageSlideshowMode && store.state.selectedSet.has(String(imgData.path))) {
            card.classList.add("selected");
        }

        const img = document.createElement("img");
        img.src = toFileUrl(imgData.path);

        const overlay = document.createElement("div");
        overlay.className = "overlay";

        const overlayText = document.createElement("div");
        overlayText.className = "overlay-text";
        overlayText.innerText = store.state.isManageSlideshowMode
            ? (store.state.selectedSet.has(String(imgData.path)) ? "Selected" : "Select")
            : "Set Wallpaper";

        overlay.appendChild(overlayText);
        card.appendChild(img);
        card.appendChild(overlay);

        const hash = imgData.filename.split(".")[0];
        const meta = store.state.localMetadata.wallpaper_metadata[hash] || {};
        if (meta.quality) {
            const qBadge = document.createElement("span");
            qBadge.className = "card-badge quality-badge";
            qBadge.innerText = meta.quality;
            card.appendChild(qBadge);
        }
        if (meta.style) {
            const sBadge = document.createElement("span");
            sBadge.className = "card-badge style-badge";
            sBadge.innerText = meta.style;
            card.appendChild(sBadge);
        }

        card.addEventListener("dblclick", (e) => {
            if (store.state.isManageSlideshowMode) return;
            e.stopPropagation();
            openLightboxAt(index);
        });

        card.addEventListener("click", async () => {
            if (store.state.isManageSlideshowMode) {
                const isSelected = !card.classList.contains("selected");
                if (isSelected) card.classList.add("selected");
                else card.classList.remove("selected");
                const key = String(imgData.path);
                if (isSelected) store.state.selectedSet.add(key);
                else store.state.selectedSet.delete(key);
                await window.api.toggleSelection(key, isSelected);
                if (slideshowSelectedCount) slideshowSelectedCount.textContent = String(store.state.selectedSet.size);
                overlayText.innerText = isSelected ? "Selected" : "Select";
                showToast(isSelected ? "Added to favorites" : "Removed from favorites", "success");
                return;
            }

            openDetailDrawer(imgData);
        });

        gallery.appendChild(card);
    });
}

// 6. Fullscreen Lightbox Image Viewer Logic
export function setLightboxOpen(open) {
    const lightbox = document.getElementById("lightbox");
    store.state.lightboxOpen = !!open;
    if (!lightbox) return;
    if (store.state.lightboxOpen) {
        lightbox.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    } else {
        lightbox.classList.add("hidden");
        document.body.style.overflow = "";
        store.state.lightboxIndex = -1;
    }
    updateLightboxNavState();
}

export function updateLightboxNavState() {
    const lightboxPrev = document.getElementById("lightboxPrev");
    const lightboxNext = document.getElementById("lightboxNext");
    const currentImages = store.state.currentImages || [];
    const hasMany = currentImages.length > 1;
    const isOpen = !!store.state.lightboxOpen;
    if (lightboxPrev) lightboxPrev.style.display = (isOpen && hasMany) ? "" : "none";
    if (lightboxNext) lightboxNext.style.display = (isOpen && hasMany) ? "" : "none";
}

export function showLightboxAt(index) {
    const lightboxImage = document.getElementById("lightboxImage");
    const currentImages = store.state.currentImages || [];
    if (!lightboxImage || currentImages.length === 0) return;
    const safeIndex = Math.max(0, Math.min(currentImages.length - 1, Number(index) || 0));
    store.state.lightboxIndex = safeIndex;
    lightboxImage.src = toFileUrl(currentImages[safeIndex].path);
    updateLightboxNavState();
}

export function openLightboxAt(index) {
    setLightboxOpen(true);
    showLightboxAt(index);
}

export function closeLightbox() {
    const lightboxImage = document.getElementById("lightboxImage");
    setLightboxOpen(false);
    if (lightboxImage) lightboxImage.src = "";
}
