// Gallery lists, grids, filter UI and lightbox viewer components
import { store } from "../store.js";
import { toFileUrl, fuzzyMatch, showToast, updateNavButtonsVisibility } from "./utils.js";
import { openDetailDrawer } from "./drawer.js";

// Standard dominant color neon matching map
const COLOR_NEON_MAP = {
    "red": { primary: "#ff2d55", glow: "rgba(255, 45, 85, 0.4)" },
    "orange": { primary: "#ff9500", glow: "rgba(255, 149, 0, 0.4)" },
    "yellow": { primary: "#ffcc00", glow: "rgba(255, 204, 0, 0.4)" },
    "green": { primary: "#34c759", glow: "rgba(52, 199, 89, 0.4)" },
    "teal": { primary: "#30b0c7", glow: "rgba(48, 176, 199, 0.4)" },
    "blue": { primary: "#007aff", glow: "rgba(0, 122, 255, 0.4)" },
    "indigo": { primary: "#5856d6", glow: "rgba(88, 86, 214, 0.4)" },
    "purple": { primary: "#af52de", glow: "rgba(175, 82, 222, 0.4)" },
    "pink": { primary: "#ff2d55", glow: "rgba(255, 45, 85, 0.4)" },
    "brown": { primary: "#a2845e", glow: "rgba(162, 132, 94, 0.4)" },
    "gray": { primary: "#8e8e93", glow: "rgba(142, 142, 147, 0.4)" },
    "black": { primary: "#ffffff", glow: "rgba(255, 255, 255, 0.15)" },
    "white": { primary: "#ffffff", glow: "rgba(255, 255, 255, 0.4)" }
};

export function applyDynamicAccentColor(colorName) {
    if (!colorName) return;
    const lower = colorName.toLowerCase();
    const mapped = COLOR_NEON_MAP[lower] || { primary: colorName, glow: colorName + "44" };
    document.documentElement.style.setProperty("--primary", mapped.primary);
    document.documentElement.style.setProperty("--primary-glow", mapped.glow);
    
    // Update taskbar start button color if mockup is visible
    const startBtn = document.querySelector(".mockup-taskbar-start");
    if (startBtn) {
        startBtn.style.backgroundColor = mapped.primary;
    }
}

export function resetDynamicAccentColor() {
    // Restore default indigo glows
    document.documentElement.style.setProperty("--primary", "#7209b7");
    document.documentElement.style.setProperty("--primary-glow", "rgba(114, 9, 183, 0.4)");
    
    const startBtn = document.querySelector(".mockup-taskbar-start");
    if (startBtn) {
        startBtn.style.backgroundColor = "#7209b7";
    }
}

export function resetFiltersUI() {
    store.state.selectedColorFilter = "";
    store.state.selectedTagFilters = [];
    
    // Reset quick tag pills active state
    document.querySelectorAll("#quickTagsList .quick-tag-pill").forEach(p => p.classList.remove("active"));
    
    // Reset native dropdowns
    const colFilter = document.getElementById("colFilter");
    const tagFilter = document.getElementById("tagFilter");
    const globalSearchInput = document.getElementById("globalSearchInput");
    if (colFilter) colFilter.value = "";
    if (tagFilter) tagFilter.value = "";
    if (globalSearchInput) globalSearchInput.value = "";

    // Reset active selected collection cards
    document.querySelectorAll(".category-card").forEach(c => c.classList.remove("active-selected"));
}

// 1. Populate Collection and Tag filters + Search Quick Tags
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

    // Populate tags dropdown
    localMetadata.tags.forEach(tag => {
        tagFilter.innerHTML += `<option value="${tag.id}">${tag.name}</option>`;
    });

    // Populate search quick-tags pills bar
    renderSearchQuickTags();

    // Restore selections
    tagFilter.value = activeTagFilter;

    // Populate collections dropdown
    updateCollectionsDropdowns(activeColFilter);

    // Initialize All Collections Explorer modal & Search Auto-Suggest
    initAllCollectionsModal();
    initSearchAutoSuggest();
}

export function renderSearchQuickTags() {
    const container = document.getElementById("quickTagsList");
    if (!container) return;
    container.innerHTML = "";

    const localMetadata = store.state.localMetadata;
    if (!localMetadata.tags || localMetadata.tags.length === 0) return;

    // Pick 10 randomized tags for dynamic suggestion
    const shuffled = [...localMetadata.tags].sort(() => 0.5 - Math.random()).slice(0, 10);

    shuffled.forEach(tag => {
        const pill = document.createElement("div");
        pill.className = "quick-tag-pill";
        const globalSearchInput = document.getElementById("globalSearchInput");
        if (globalSearchInput && globalSearchInput.value.toLowerCase().includes(tag.name.toLowerCase())) {
            pill.classList.add("active");
        }
        pill.textContent = `#${tag.name}`;
        pill.addEventListener("click", () => {
            if (!globalSearchInput) return;
            if (globalSearchInput.value.toLowerCase() === tag.name.toLowerCase()) {
                globalSearchInput.value = "";
                pill.classList.remove("active");
            } else {
                globalSearchInput.value = tag.name;
                document.querySelectorAll("#quickTagsList .quick-tag-pill").forEach(p => p.classList.remove("active"));
                pill.classList.add("active");
            }
            renderCatalog();
        });
        container.appendChild(pill);
    });

    const shuffleBtn = document.getElementById("shuffleTagsBtn");
    if (shuffleBtn && !shuffleBtn.dataset.wired) {
        shuffleBtn.dataset.wired = "true";
        shuffleBtn.addEventListener("click", () => {
            renderSearchQuickTags();
        });
    }
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

// Helper: Calculate statistics map for collections
function getCollectionStatsMap() {
    const localMetadata = store.state.localMetadata;
    const currentImages = store.state.currentImages || [];

    const colMap = {};
    localMetadata.collections.forEach(col => {
        colMap[col.id] = { id: col.id, name: col.name, count: 0, cover: "" };
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

    return colMap;
}

// 2. Render Overhauled Collections Horizontal Section
export function renderCategorySection() {
    const grid = document.getElementById("categoriesGrid");
    const countBadge = document.getElementById("collectionsCountBadge");
    if (!grid) return;
    grid.innerHTML = "";

    const localMetadata = store.state.localMetadata;
    if (countBadge) {
        countBadge.textContent = String(localMetadata.collections.length);
    }

    // Always wire up View All Collections modal handlers
    initAllCollectionsModal();

    if (localMetadata.collections.length === 0) {
        grid.innerHTML = '<span style="color:var(--text-muted); font-size:12px; padding:10px;">No collections created yet</span>';
        return;
    }

    const colMap = getCollectionStatsMap();
    const colFilter = document.getElementById("colFilter");

    localMetadata.collections.forEach(col => {
        const stats = colMap[col.id] || { id: col.id, name: col.name, count: 0, cover: "" };
        const card = createCollectionCardElement(col, stats, colFilter);
        grid.appendChild(card);
    });

    // Enable smooth horizontal wheel scroll on categories grid
    if (!grid.dataset.wheelWired) {
        grid.dataset.wheelWired = "true";
        grid.addEventListener("wheel", (e) => {
            if (e.ctrlKey || Math.abs(e.deltaY) < 0.01) return;
            if (grid.scrollWidth <= grid.clientWidth) return;
            e.preventDefault();
            grid.scrollLeft += e.deltaY * 1.5;
        }, { passive: false });
    }
}

// Helper: Create a standard overhauled collection card DOM element
function createCollectionCardElement(col, stats, colFilter) {
    const card = document.createElement("div");
    card.className = "category-card";
    if (colFilter && colFilter.value && String(colFilter.value) === String(col.id)) {
        card.classList.add("active-selected");
    }

    const colors = ["#2b5c8f", "#126e51", "#8f3b2b", "#772b8f", "#8f7c2b", "#1a73e8", "#38bdf8", "#a855f7"];
    const color = colors[Math.abs(col.name.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];

    if (stats.cover) {
        card.innerHTML = `<img class="category-card-img" src="${stats.cover}" alt="${col.name}" loading="lazy" />`;
    } else {
        card.style.backgroundColor = color;
    }

    const overlay = document.createElement("div");
    overlay.className = "category-card-overlay";
    overlay.innerHTML = `
        <span class="category-card-badge">⚡ ${stats.count}</span>
        <div class="category-card-info">
            <span class="category-card-title">${col.name}</span>
            <span class="category-card-subtitle">${stats.count} ${stats.count === 1 ? 'wallpaper' : 'wallpapers'}</span>
        </div>
    `;

    card.appendChild(overlay);

    card.addEventListener("click", () => {
        if (colFilter) {
            if (colFilter.value && String(colFilter.value) === String(col.id)) {
                colFilter.value = "";
            } else {
                colFilter.value = col.id;
            }
            colFilter.dispatchEvent(new Event("change"));
            
            // Highlight active cards across grids
            document.querySelectorAll(".category-card").forEach(c => c.classList.remove("active-selected"));
            if (colFilter.value) {
                card.classList.add("active-selected");
            }
            document.getElementById("catalogFilterSection")?.scrollIntoView({ behavior: "smooth" });
        }
    });

    return card;
}

// 2b. All Collections Explorer Modal Logic
export function initAllCollectionsModal() {
    const viewAllBtn = document.getElementById("viewAllCollectionsBtn");
    const modal = document.getElementById("allCollectionsModal");
    const closeBtn = document.getElementById("closeAllCollectionsModal");
    const backdrop = document.getElementById("allCollectionsModalBackdrop");
    const modalSearch = document.getElementById("modalCollectionSearch");

    if (!viewAllBtn || !modal) return;

    if (!viewAllBtn.dataset.wired) {
        viewAllBtn.dataset.wired = "true";
        viewAllBtn.addEventListener("click", () => {
            renderAllCollectionsModalGrid();
            modal.classList.remove("hidden");
        });
    }

    if (closeBtn && !closeBtn.dataset.wired) {
        closeBtn.dataset.wired = "true";
        closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
    }

    if (backdrop && !backdrop.dataset.wired) {
        backdrop.dataset.wired = "true";
        backdrop.addEventListener("click", () => modal.classList.add("hidden"));
    }

    if (modalSearch && !modalSearch.dataset.wired) {
        modalSearch.dataset.wired = "true";
        modalSearch.addEventListener("input", () => {
            renderAllCollectionsModalGrid(modalSearch.value);
        });
    }
}

export function renderAllCollectionsModalGrid(filterQuery = "") {
    const modalGrid = document.getElementById("allCollectionsModalGrid");
    const modalBadge = document.getElementById("allColsModalBadge");
    if (!modalGrid) return;
    modalGrid.innerHTML = "";

    const localMetadata = store.state.localMetadata;
    const colMap = getCollectionStatsMap();
    const colFilter = document.getElementById("colFilter");

    let collections = localMetadata.collections;
    if (filterQuery) {
        const q = filterQuery.toLowerCase().trim();
        collections = collections.filter(c => c.name.toLowerCase().includes(q));
    }

    if (modalBadge) {
        modalBadge.textContent = `${collections.length} ${collections.length === 1 ? 'Collection' : 'Collections'}`;
    }

    if (collections.length === 0) {
        modalGrid.innerHTML = '<span style="color:var(--text-muted); font-size:12px; grid-column:1/-1; text-align:center; padding:30px;">No matching collections found</span>';
        return;
    }

    collections.forEach(col => {
        const stats = colMap[col.id] || { id: col.id, name: col.name, count: 0, cover: "" };
        const card = createCollectionCardElement(col, stats, colFilter);
        card.addEventListener("click", () => {
            document.getElementById("allCollectionsModal")?.classList.add("hidden");
        });
        modalGrid.appendChild(card);
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

    const isSearching = !!query || !!colFilterId || !!tagFilterId || !!store.state.selectedColorFilter || (store.state.selectedTagFilters && store.state.selectedTagFilters.length > 0);
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
        } else if (store.state.selectedColorFilter) {
            catalogTitle.innerText = `Color: ${store.state.selectedColorFilter}`;
        } else if (store.state.selectedTagFilters && store.state.selectedTagFilters.length > 0) {
            const tagNames = store.state.selectedTagFilters.map(id => store.state.localMetadata.tags.find(t => t.id === id)?.name || "").filter(Boolean);
            catalogTitle.innerText = `Tags: ${tagNames.join(", ")}`;
        } else {
            catalogTitle.innerText = "Explore All Wallpapers";
        }
    }

    // Scored & Ranked Search Matching Engine
    const scoredItems = (store.state.currentImages || []).map(img => {
        const hash = img.filename.split(".")[0];
        const meta = store.state.localMetadata.wallpaper_metadata[hash] || {};
        const collectionIds = Array.isArray(meta.collection_ids) ? meta.collection_ids : (meta.collection_id ? [meta.collection_id] : []);
        const wtags = meta.tags ? store.state.localMetadata.tags.filter(t => meta.tags.includes(t.id)) : [];
        const matchedCols = store.state.localMetadata.collections.filter(c => collectionIds.includes(Number(c.id)));

        // Mandatory dropdown filters
        if (colFilterId && !collectionIds.some(id => String(id) === String(colFilterId))) return null;
        if (tagFilterId && (!meta.tags || !meta.tags.includes(Number(tagFilterId)))) return null;
        if (store.state.selectedTagFilters && store.state.selectedTagFilters.length > 0) {
            const hasAllPills = store.state.selectedTagFilters.every(id => meta.tags && meta.tags.includes(Number(id)));
            if (!hasAllPills) return null;
        }

        let score = 1;

        if (query) {
            score = 0;
            const q = query.toLowerCase();

            // Tag matches (highest priority)
            wtags.forEach(t => {
                const tagName = t.name.toLowerCase();
                if (tagName === q) score += 100;
                else if (tagName.startsWith(q)) score += 65;
                else if (tagName.includes(q)) score += 40;
            });

            // Collection matches (high priority)
            matchedCols.forEach(c => {
                const colName = c.name.toLowerCase();
                if (colName === q) score += 90;
                else if (colName.startsWith(q)) score += 55;
                else if (colName.includes(q)) score += 35;
            });

            // Title / Description / Filename matches
            const title = (meta.title || meta.file_name || img.filename).toLowerCase();
            if (title === q) score += 80;
            else if (title.startsWith(q)) score += 45;
            else if (title.includes(q)) score += 25;

            const desc = (meta.description || "").toLowerCase();
            if (desc.includes(q)) score += 15;

            if (score === 0) return null;
        }

        return { img, score };
    }).filter(Boolean);

    // Sort by relevance score descending
    scoredItems.sort((a, b) => b.score - a.score);
    const filtered = scoredItems.map(item => item.img);

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

        // Dynamic Accent color syncing on hover
        card.addEventListener("mouseenter", () => {
            if (meta.primary_color) {
                applyDynamicAccentColor(meta.primary_color);
            }
        });
        card.addEventListener("mouseleave", () => {
            // Restore default unless drawer is open
            if (store.state.currentSelectedImage) {
                const activeHash = store.state.currentSelectedImage.filename.split(".")[0];
                const activeMeta = store.state.localMetadata.wallpaper_metadata[activeHash] || {};
                if (activeMeta.primary_color) {
                    applyDynamicAccentColor(activeMeta.primary_color);
                    return;
                }
            }
            resetDynamicAccentColor();
        });

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

// 7. Real-time YouTube-style Auto-complete Suggestions Controller
export function initSearchAutoSuggest() {
    const searchInput = document.getElementById("globalSearchInput");
    const dropdown = document.getElementById("searchSuggestionsDropdown");
    const clearBtn = document.getElementById("clearSearchBtn");
    if (!searchInput || !dropdown) return;

    let activeIndex = -1;

    const renderSuggestions = (query) => {
        const q = query.toLowerCase().trim();
        dropdown.innerHTML = "";

        if (clearBtn) {
            if (q.length > 0) clearBtn.classList.remove("hidden");
            else clearBtn.classList.add("hidden");
        }

        if (q.length < 1) {
            dropdown.classList.add("hidden");
            activeIndex = -1;
            return;
        }

        const localMetadata = store.state.localMetadata;
        const currentImages = store.state.currentImages || [];

        // 1. Matching Collections
        const matchingCols = (localMetadata.collections || [])
            .filter(c => c.name.toLowerCase().includes(q))
            .slice(0, 3);

        // 2. Matching Tags
        const matchingTags = (localMetadata.tags || [])
            .filter(t => t.name.toLowerCase().includes(q))
            .slice(0, 4);

        // 3. Matching Wallpaper Titles
        const matchingWps = [];
        const seenTitles = new Set();
        currentImages.forEach(img => {
            const hash = img.filename.split(".")[0];
            const meta = localMetadata.wallpaper_metadata[hash] || {};
            const title = meta.title || img.filename.split(".")[0];
            if (title.toLowerCase().includes(q) && !seenTitles.has(title.toLowerCase())) {
                seenTitles.add(title.toLowerCase());
                matchingWps.push({ title, hash });
            }
        });
        const topWps = matchingWps.slice(0, 3);

        if (matchingCols.length === 0 && matchingTags.length === 0 && topWps.length === 0) {
            dropdown.classList.add("hidden");
            return;
        }

        // Render Collection Suggestions
        if (matchingCols.length > 0) {
            const titleEl = document.createElement("div");
            titleEl.className = "suggestion-group-title";
            titleEl.textContent = "📁 Collections";
            dropdown.appendChild(titleEl);

            matchingCols.forEach(col => {
                const item = createSuggestionItem("📁", col.name, "Collection", q, () => {
                    selectSearchSuggestion(col.name);
                });
                dropdown.appendChild(item);
            });
        }

        // Render Tag Suggestions
        if (matchingTags.length > 0) {
            const titleEl = document.createElement("div");
            titleEl.className = "suggestion-group-title";
            titleEl.textContent = "🏷️ Tags";
            dropdown.appendChild(titleEl);

            matchingTags.forEach(tag => {
                const item = createSuggestionItem("🏷️", `#${tag.name}`, "Tag", q, () => {
                    selectSearchSuggestion(tag.name);
                });
                dropdown.appendChild(item);
            });
        }

        // Render Wallpaper Title Suggestions
        if (topWps.length > 0) {
            const titleEl = document.createElement("div");
            titleEl.className = "suggestion-group-title";
            titleEl.textContent = "🖼️ Wallpapers";
            dropdown.appendChild(titleEl);

            topWps.forEach(wp => {
                const item = createSuggestionItem("🖼️", wp.title, "Wallpaper", q, () => {
                    selectSearchSuggestion(wp.title);
                });
                dropdown.appendChild(item);
            });
        }

        dropdown.classList.remove("hidden");
        activeIndex = -1;
    };

    const createSuggestionItem = (icon, text, type, query, onClick) => {
        const item = document.createElement("div");
        item.className = "suggestion-item";

        const iconEl = document.createElement("span");
        iconEl.className = "suggestion-icon";
        iconEl.textContent = icon;

        const textEl = document.createElement("span");
        textEl.className = "suggestion-text";
        
        // Highlight query match in text
        const lowerText = text.toLowerCase();
        const matchIdx = lowerText.indexOf(query.toLowerCase());
        if (matchIdx !== -1) {
            const before = text.substring(0, matchIdx);
            const match = text.substring(matchIdx, matchIdx + query.length);
            const after = text.substring(matchIdx + query.length);
            textEl.innerHTML = `${escapeHtml(before)}<span class="suggestion-highlight">${escapeHtml(match)}</span>${escapeHtml(after)}`;
        } else {
            textEl.textContent = text;
        }

        const badgeEl = document.createElement("span");
        badgeEl.className = "suggestion-badge";
        badgeEl.textContent = type;

        item.appendChild(iconEl);
        item.appendChild(textEl);
        item.appendChild(badgeEl);

        item.addEventListener("click", (e) => {
            e.stopPropagation();
            onClick();
        });

        return item;
    };

    const selectSearchSuggestion = (text) => {
        const cleanText = text.replace(/^#/, "");
        searchInput.value = cleanText;
        dropdown.classList.add("hidden");
        renderCatalog();
    };

    const escapeHtml = (str) => {
        return str.replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[m]);
    };

    if (!searchInput.dataset.wired) {
        searchInput.dataset.wired = "true";

        searchInput.addEventListener("input", (e) => {
            renderSuggestions(e.target.value);
            renderCatalog();
        });

        searchInput.addEventListener("focus", (e) => {
            if (e.target.value.trim().length > 0) {
                renderSuggestions(e.target.value);
            }
        });

        searchInput.addEventListener("keydown", (e) => {
            const items = dropdown.querySelectorAll(".suggestion-item");
            if (items.length === 0 || dropdown.classList.contains("hidden")) {
                if (e.key === "Enter") {
                    dropdown.classList.add("hidden");
                    renderCatalog();
                }
                return;
            }

            if (e.key === "ArrowDown") {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                items.forEach((it, i) => it.classList.toggle("active-item", i === activeIndex));
                items[activeIndex]?.scrollIntoView({ block: "nearest" });
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + items.length) % items.length;
                items.forEach((it, i) => it.classList.toggle("active-item", i === activeIndex));
                items[activeIndex]?.scrollIntoView({ block: "nearest" });
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (activeIndex >= 0 && items[activeIndex]) {
                    items[activeIndex].click();
                } else {
                    dropdown.classList.add("hidden");
                    renderCatalog();
                }
            } else if (e.key === "Escape") {
                dropdown.classList.add("hidden");
            }
        });
    }

    if (clearBtn && !clearBtn.dataset.wired) {
        clearBtn.dataset.wired = "true";
        clearBtn.addEventListener("click", () => {
            searchInput.value = "";
            clearBtn.classList.add("hidden");
            dropdown.classList.add("hidden");
            renderCatalog();
        });
    }

    // Hide dropdown when clicking outside search box
    document.addEventListener("click", (e) => {
        const wrap = document.querySelector(".search-box-wrapper");
        if (wrap && !wrap.contains(e.target)) {
            dropdown.classList.add("hidden");
        }
    });
}
