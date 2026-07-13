document.addEventListener("DOMContentLoaded", async () => {
    // DOM Elements
    const gallery = document.getElementById("gallery");
    const slideshowSourceType = document.getElementById("slideshowSourceType");
    const slideshowSourceIdRow = document.getElementById("slideshowSourceIdRow");
    const slideshowSourceId = document.getElementById("slideshowSourceId");
    const slideshowOrder = document.getElementById("slideshowOrder");
    const intervalDropdown = document.getElementById("intervalDropdown");
    const wallpaperCountElement = document.getElementById("wallpaperCount");
    const syncProgressElement = document.getElementById("syncProgress");
    const syncProgressBarFill = document.getElementById("syncProgressBarFill");
    const clearLocalBtn = document.getElementById("clearLocalBtn");
    const fetchWallpapersBtn = document.getElementById("fetchWallpapersBtn");
    const syncMetadataBtn = document.getElementById("syncMetadataBtn");

    // Collapsible Headers
    const toggleSlideshowSettingsBtn = document.getElementById("toggleSlideshowSettingsBtn");
    const slideshowSettingsPanel = document.getElementById("slideshowSettingsPanel");
    const toggleMaintenanceBtn = document.getElementById("toggleMaintenanceBtn");
    const maintenancePanel = document.getElementById("maintenancePanel");

    // Hamburger sidebar toggler
    const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
    const appLayout = document.getElementById("appLayout");

    // Media Player controls
    const playerStatus = document.getElementById("playerStatus");
    const playerPlayBtn = document.getElementById("playerPlayBtn");
    const playerPauseBtn = document.getElementById("playerPauseBtn");
    const playerNextBtn = document.getElementById("playerNextBtn");

    const manageSlideshowBtn = document.getElementById("manageSlideshowBtn");
    const slideshowSelectedCount = document.getElementById("slideshowSelectedCount");
    const gallerySubheader = document.getElementById("gallerySubheader");
    const manageDoneBtn = document.getElementById("manageDoneBtn");
    const selectedPreview = document.getElementById("selectedPreview");

    const connectionStatus = document.getElementById("connectionStatus");
    const globalSearchInput = document.getElementById("globalSearchInput");

    // Catalog Filters
    const catFilter = document.getElementById("catFilter");
    const colFilter = document.getElementById("colFilter");
    const tagFilter = document.getElementById("tagFilter");
    const clearFiltersBtn = document.getElementById("clearFiltersBtn");

    // Detail Drawer
    const detailDrawer = document.getElementById("detailDrawer");
    const closeDrawerBtn = document.getElementById("closeDrawerBtn");
    const drawerImage = document.getElementById("drawerImage");
    const drawerFileName = document.getElementById("drawerFileName");
    const drawerResolution = document.getElementById("drawerResolution");
    const drawerSize = document.getElementById("drawerSize");
    const drawerCategorySelect = document.getElementById("drawerCategorySelect");
    const drawerCollectionSelect = document.getElementById("drawerCollectionSelect");
    const drawerTagsContainer = document.getElementById("drawerTagsContainer");
    const drawerApplyBtn = document.getElementById("drawerApplyBtn");
    const drawerFavBtn = document.getElementById("drawerFavBtn");
    const drawerDeleteBtn = document.getElementById("drawerDeleteBtn");

    // Creator Modal
    const creatorModal = document.getElementById("creatorModal");
    const creatorModalBackdrop = document.getElementById("creatorModalBackdrop");
    const creatorModalTitle = document.getElementById("creatorModalTitle");
    const creatorModalInput = document.getElementById("creatorModalInput");
    const creatorModalConfirm = document.getElementById("creatorModalConfirm");
    const creatorModalCancel = document.getElementById("creatorModalCancel");

    // Feedback / Review Modal elements
    const reviewModal = document.getElementById("reviewModal");
    const reviewModalBackdrop = document.getElementById("reviewModalBackdrop");
    const ratingStarsRow = document.getElementById("ratingStarsRow");
    const reviewNameInput = document.getElementById("reviewNameInput");
    const reviewCommentInput = document.getElementById("reviewCommentInput");
    const reviewConfirmBtn = document.getElementById("reviewConfirmBtn");
    const reviewCancelBtn = document.getElementById("reviewCancelBtn");
    let selectedRating = 0;

    // Update checker elements in top header
    const updateStatusText = document.getElementById("updateStatusText");
    const checkUpdatesBtn = document.getElementById("checkUpdatesBtn");
    const downloadUpdateBtn = document.getElementById("downloadUpdateBtn");
    const installUpdateBtn = document.getElementById("installUpdateBtn");

    // App State
    let settings = {};
    let localMetadata = { categories: [], collections: [], tags: [], wallpaper_metadata: {}, sync_queue: {} };
    let currentImages = []; // Local file records: [{ filename, path }]
    let isManageSlideshowMode = false;
    let selectedSet = new Set();
    let currentSelectedImage = null; // Currently opened image in drawer
    let sliderActiveIndex = 0;
    let sliderInterval = null;
    let isSliderPaused = false;

    // Load initial settings and metadata
    async function init() {
        settings = await window.api.getSettings();
        
        // Initial setup of smart slideshow inputs
        intervalDropdown.value = settings.slideshowInterval || 10000;
        
        if (settings.slideshowSource) {
            slideshowSourceType.value = settings.slideshowSource.type || "all";
        }
        if (settings.slideshowOrder) {
            slideshowOrder.value = settings.slideshowOrder || "sequential";
        }

        // Fetch local cache and sync connection status
        await refreshMetadata();
        await loadWallpapers();
        await updateWallpaperInfo();
        
        // Sync slides button state based on loaded settings
        setSlideshowPlaybackUI(!!settings.slideshow);
        
        // Trigger background sync on initial startup
        triggerBackgroundSync();

        // Check rating prompt eligibility on startup
        checkReviewEligibility();

        // Attach scroll optimization
        enableSmoothWheelScroll(document.getElementById("dashboardBody"));

        // Load initial update check state
        if (window.api.getUpdateState) {
            const state = await window.api.getUpdateState();
            renderUpdateUI(state);
        }
    }

    // Refresh Local metadata cache values
    async function refreshMetadata() {
        try {
            localMetadata = await window.api.getMetadata();
            populateFiltersAndDropdowns();
            renderCategorySection();
            updatePlayerStatusText();
        } catch (e) {
            console.error("Failed to load local metadata:", e);
        }
    }

    // Adjust slideshow status indicator UI
    function setSlideshowPlaybackUI(isPlaying) {
        if (isPlaying) {
            playerPlayBtn.classList.add("hidden");
            playerPauseBtn.classList.remove("hidden");
        } else {
            playerPlayBtn.classList.remove("hidden");
            playerPauseBtn.classList.add("hidden");
        }
        updatePlayerStatusText();
    }

    function updatePlayerStatusText() {
        if (settings.slideshow) {
            let sourceLabel = "All";
            const src = settings.slideshowSource || { type: "all", id: null };

            if (src.type === "favorites") {
                sourceLabel = "Favorites";
            } else if (src.type === "category" && src.id) {
                const cat = localMetadata.categories.find(c => String(c.id) === String(src.id));
                sourceLabel = cat ? cat.name : "Category";
            } else if (src.type === "collection" && src.id) {
                const col = localMetadata.collections.find(c => String(c.id) === String(src.id));
                sourceLabel = col ? col.name : "Collection";
            }

            const intervalMs = settings.slideshowInterval || 10000;
            const intervalSec = intervalMs >= 60000 ? `${intervalMs / 60000}m` : `${intervalMs / 1000}s`;

            playerStatus.textContent = `Slideshow Active: ${sourceLabel} (${intervalSec})`;
            playerStatus.className = "player-status playing";
        } else {
            playerStatus.textContent = "Slideshow Stopped";
            playerStatus.className = "player-status";
        }
    }

    // Populate Category, Collection, and Tag filters and selects
    function populateFiltersAndDropdowns() {
        const activeCatFilter = catFilter.value;
        const activeColFilter = colFilter.value;
        const activeTagFilter = tagFilter.value;
        const activeDrawerCat = drawerCategorySelect.value;
        const activeDrawerCol = drawerCollectionSelect.value;

        // Clear dropdown filters
        catFilter.innerHTML = '<option value="">All Categories</option>';
        colFilter.innerHTML = '<option value="">All Collections</option>';
        tagFilter.innerHTML = '<option value="">All Tags</option>';
        
        drawerCategorySelect.innerHTML = '<option value="">None / Uncategorized</option><option value="CREATE_NEW_CAT" style="font-weight:600; color:var(--accent);">+ Create New Category</option>';
        drawerCollectionSelect.innerHTML = '<option value="">None / Select Collection</option>';

        // 1. Populate categories
        localMetadata.categories.forEach(cat => {
            const opt = `<option value="${cat.id}">${cat.name}</option>`;
            catFilter.innerHTML += opt;
            drawerCategorySelect.innerHTML += opt;
        });

        // 2. Populate tags
        localMetadata.tags.forEach(tag => {
            tagFilter.innerHTML += `<option value="${tag.id}">#${tag.name}</option>`;
        });

        // Restore selections
        catFilter.value = activeCatFilter;
        tagFilter.value = activeTagFilter;
        drawerCategorySelect.value = activeDrawerCat;

        // Populate collections filters/dropdowns
        updateCollectionsDropdowns(activeColFilter, activeDrawerCol);
    }

    function updateCollectionsDropdowns(selectedColFilterId = "", selectedDrawerColId = "") {
        // 1. Catalog collections filter
        colFilter.innerHTML = '<option value="">All Collections</option>';
        const filterCatId = catFilter.value;
        
        if (filterCatId) {
            colFilter.disabled = false;
            localMetadata.collections
                .filter(col => col.category_id === Number(filterCatId))
                .forEach(col => {
                    colFilter.innerHTML += `<option value="${col.id}">${col.name}</option>`;
                });
            colFilter.value = selectedColFilterId;
        } else {
            colFilter.disabled = true;
        }

        // 2. Drawer collections dropdown
        drawerCollectionSelect.innerHTML = '<option value="">None / Select Collection</option>';
        const drawerCatId = drawerCategorySelect.value;

        if (drawerCatId && drawerCatId !== "CREATE_NEW_CAT") {
            drawerCollectionSelect.disabled = false;
            // Add Create new option
            drawerCollectionSelect.innerHTML += '<option value="CREATE_NEW_COL" style="font-weight:600; color:var(--accent);">+ Create New Collection</option>';
            
            localMetadata.collections
                .filter(col => col.category_id === Number(drawerCatId))
                .forEach(col => {
                    drawerCollectionSelect.innerHTML += `<option value="${col.id}">${col.name}</option>`;
                });
            drawerCollectionSelect.value = selectedDrawerColId;
        } else {
            drawerCollectionSelect.disabled = true;
        }
    }

    // Trigger metadata background sync and update indicators
    async function triggerBackgroundSync() {
        updateConnectionDot("offline", "Syncing...");
        try {
            const syncRes = await window.api.syncMetadataNow();
            if (syncRes && !syncRes.error) {
                const pendingCount = 
                    (localMetadata.sync_queue?.categories?.length || 0) +
                    (localMetadata.sync_queue?.collections?.length || 0) +
                    (localMetadata.sync_queue?.tags?.length || 0) +
                    (localMetadata.sync_queue?.wallpapers?.length || 0);

                if (pendingCount > 0) {
                    updateConnectionDot("offline", `Offline (${pendingCount} pending)`);
                } else {
                    updateConnectionDot("online", "Connected");
                }
                await refreshMetadata();
                await loadWallpapers();
            } else {
                updateConnectionDot("unreachable", syncRes.error || "Server offline");
            }
        } catch (err) {
            updateConnectionDot("unreachable", "Sync failed");
        }
    }

    function updateConnectionDot(status, text) {
        const dot = connectionStatus.querySelector(".status-dot");
        const statusText = connectionStatus.querySelector(".status-text");

        dot.className = "status-dot";
        if (status === "online") {
            dot.classList.add("status-online");
        } else if (status === "offline") {
            dot.classList.add("status-offline");
        } else {
            dot.classList.add("status-unreachable");
        }
        statusText.textContent = text;
    }

    // Horizontal category cards
    function renderCategorySection() {
        const grid = document.getElementById("categoriesGrid");
        grid.innerHTML = "";

        if (localMetadata.categories.length === 0) {
            grid.innerHTML = '<span style="color:var(--text-muted); font-size:12px; padding:10px;">No categories created yet</span>';
            return;
        }

        const catMap = {};
        localMetadata.categories.forEach(cat => {
            catMap[cat.id] = { name: cat.name, count: 0, cover: "" };
        });

        localMetadata.collections.forEach(col => {
            if (catMap[col.category_id]) {
                catMap[col.category_id].count++;
            }
        });

        localMetadata.categories.forEach(cat => {
            const stats = catMap[cat.id];
            
            const card = document.createElement("div");
            card.className = "category-card";
            
            const colors = ["#2b5c8f", "#126e51", "#8f3b2b", "#772b8f", "#8f7c2b", "#1a73e8"];
            const color = colors[Math.abs(cat.name.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];

            card.innerHTML = `
                <div class="category-card-overlay" style="background: linear-gradient(rgba(0,0,0,0.1), ${color});">
                    <span class="category-card-title">${cat.name}</span>
                    <span class="category-card-subtitle">${stats.count} collections</span>
                </div>
            `;

            card.addEventListener("click", () => {
                catFilter.value = cat.id;
                catFilter.dispatchEvent(new Event("change"));
                document.getElementById("catalogFilterSection")?.scrollIntoView({ behavior: "smooth" });
                catFilter.scrollIntoView({ behavior: "smooth" });
            });

            grid.appendChild(card);
        });
    }

    // Helper functions for layouts
    function toFileUrl(absolutePath) {
        if (!absolutePath) return "";
        const normalized = String(absolutePath).replace(/\\/g, "/");
        const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
        return encodeURI(`file://${withLeadingSlash}`);
    }

    // Load Wallpapers and draw center dashboard lists
    async function loadWallpapers() {
        const images = await window.api.getWallpapers();
        currentImages = Array.isArray(images) ? images : [];
        const settingsObj = await window.api.getSettings();
        selectedSet = new Set((settingsObj.selectedImages || []).map(String));

        if (slideshowSelectedCount) {
            slideshowSelectedCount.textContent = String(selectedSet.size);
        }

        // Redraw lists
        renderHeroSlider();
        renderRecentlyAdded();
        renderRandomDiscoveries();
        renderCatalog();
        populateSlideshowSourceOptions();
    }

    // Populate smart slideshow source dropdown options
    function populateSlideshowSourceOptions() {
        const activeType = slideshowSourceType.value;
        const currentSource = settings.slideshowSource || { type: "all", id: null };

        slideshowSourceId.innerHTML = "";

        if (activeType === "category") {
            slideshowSourceIdRow.classList.remove("hidden");
            localMetadata.categories.forEach(cat => {
                const selectedAttr = (currentSource.type === "category" && String(currentSource.id) === String(cat.id)) ? "selected" : "";
                slideshowSourceId.innerHTML += `<option value="${cat.id}" ${selectedAttr}>${cat.name}</option>`;
            });
        } else if (activeType === "collection") {
            slideshowSourceIdRow.classList.remove("hidden");
            localMetadata.collections.forEach(col => {
                const categoryName = localMetadata.categories.find(c => c.id === col.category_id)?.name || "Uncategorized";
                const selectedAttr = (currentSource.type === "collection" && String(currentSource.id) === String(col.id)) ? "selected" : "";
                slideshowSourceId.innerHTML += `<option value="${col.id}" ${selectedAttr}>${col.name} (${categoryName})</option>`;
            });
        } else {
            slideshowSourceIdRow.classList.add("hidden");
        }
    }

    // 1. Featured Hero Slider Banner
    function renderHeroSlider() {
        const container = document.getElementById("heroSliderSection");
        container.innerHTML = "";

        if (currentImages.length === 0) {
            container.style.display = "none";
            return;
        }
        container.style.display = "block";

        const sliderList = currentImages.slice(-5).reverse();
        sliderActiveIndex = 0;

        sliderList.forEach((img, idx) => {
            const slide = document.createElement("div");
            slide.className = `hero-slide ${idx === 0 ? "active" : ""}`;
            
            const hash = img.filename.split(".")[0];
            const meta = localMetadata.wallpaper_metadata[hash] || {};
            const colName = localMetadata.collections.find(c => c.id === meta.collection_id)?.name || "Default Library";
            const catId = localMetadata.collections.find(c => c.id === meta.collection_id)?.category_id;
            const catName = localMetadata.categories.find(c => c.id === catId)?.name || "Featured";

            slide.innerHTML = `
                <img src="${toFileUrl(img.path)}" class="hero-slide-img" alt="${img.filename}" />
                <div class="hero-slide-overlay"></div>
                <div class="hero-slide-content">
                    <span class="hero-slide-tag">${catName}</span>
                    <h3 class="hero-slide-title">${colName}</h3>
                    <p class="hero-slide-desc">Recently added to your desktop wallpaper collection</p>
                    <button class="primary-btn slider-browse-btn" data-path="${img.path}">Apply Wallpaper</button>
                </div>
            `;

            slide.querySelector(".slider-browse-btn").addEventListener("click", async (e) => {
                e.stopPropagation();
                const btn = e.target;
                btn.textContent = "Applying...";
                await window.api.setWallpaper(img.path);
                btn.textContent = "Applied!";
                setTimeout(() => { btn.textContent = "Apply Wallpaper"; }, 2000);
            });

            container.appendChild(slide);
        });

        if (sliderList.length > 1) {
            const dotsContainer = document.createElement("div");
            dotsContainer.className = "slider-dots";
            
            sliderList.forEach((_, idx) => {
                const dot = document.createElement("button");
                dot.className = `slider-dot ${idx === 0 ? "active" : ""}`;
                dot.addEventListener("click", () => setActiveSlide(idx));
                dotsContainer.appendChild(dot);
            });

            container.appendChild(dotsContainer);
            startHeroSlideshow(sliderList.length);
        }
    }

    function setActiveSlide(index) {
        const slides = document.querySelectorAll(".hero-slide");
        const dots = document.querySelectorAll(".slider-dot");
        if (slides.length === 0) return;

        slides.forEach(s => s.classList.remove("active"));
        dots.forEach(d => d.classList.remove("active"));

        sliderActiveIndex = index;
        slides[sliderActiveIndex].classList.add("active");
        if (dots[sliderActiveIndex]) {
            dots[sliderActiveIndex].classList.add("active");
        }
    }

    function startHeroSlideshow(slideCount) {
        if (sliderInterval) clearInterval(sliderInterval);
        
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (mediaQuery.matches) return;

        sliderInterval = setInterval(() => {
            if (!isSliderPaused) {
                const nextIdx = (sliderActiveIndex + 1) % slideCount;
                setActiveSlide(nextIdx);
            }
        }, 6000);

        const section = document.getElementById("heroSliderSection");
        section.onmouseenter = () => { isSliderPaused = true; };
        section.onmouseleave = () => { isSliderPaused = false; };
    }

    // 2. Recently Added Row
    function renderRecentlyAdded() {
        const container = document.getElementById("recentlyAddedRow");
        container.innerHTML = "";

        if (currentImages.length === 0) {
            container.innerHTML = '<span style="color:var(--text-muted); font-size:12px; padding:10px;">No wallpapers loaded</span>';
            return;
        }

        const list = currentImages.slice(-6).reverse();
        list.forEach(img => {
            const hash = img.filename.split(".")[0];
            const meta = localMetadata.wallpaper_metadata[hash] || {};
            const col = localMetadata.collections.find(c => c.id === meta.collection_id);
            const colName = col ? col.name : "None";
            const catName = col ? (localMetadata.categories.find(c => c.id === col.category_id)?.name || "Uncategorized") : "Uncategorized";

            const card = document.createElement("div");
            card.className = "horizontal-card";
            card.innerHTML = `
                <img src="${toFileUrl(img.path)}" class="horizontal-card-img" alt="${img.filename}" />
                <div class="horizontal-card-info">
                    <div class="horizontal-card-title">${img.filename}</div>
                    <div class="horizontal-card-meta">
                        <span>${catName}</span>
                        <span>${colName}</span>
                    </div>
                </div>
            `;

            card.addEventListener("click", () => openDetailDrawer(img));
            container.appendChild(card);
        });
    }

    // 3. Random Discoveries Row
    function renderRandomDiscoveries() {
        const container = document.getElementById("randomRow");
        container.innerHTML = "";

        if (currentImages.length === 0) {
            container.innerHTML = '<span style="color:var(--text-muted); font-size:12px; padding:10px;">No wallpapers loaded</span>';
            return;
        }

        const shuffled = [...currentImages].sort(() => 0.5 - Math.random());
        const list = shuffled.slice(0, 6);

        list.forEach(img => {
            const hash = img.filename.split(".")[0];
            const meta = localMetadata.wallpaper_metadata[hash] || {};
            const col = localMetadata.collections.find(c => c.id === meta.collection_id);
            const colName = col ? col.name : "None";
            const catName = col ? (localMetadata.categories.find(c => c.id === col.category_id)?.name || "Uncategorized") : "Uncategorized";

            const card = document.createElement("div");
            card.className = "horizontal-card";
            card.innerHTML = `
                <img src="${toFileUrl(img.path)}" class="horizontal-card-img" alt="${img.filename}" />
                <div class="horizontal-card-info">
                    <div class="horizontal-card-title">${img.filename}</div>
                    <div class="horizontal-card-meta">
                        <span>${catName}</span>
                        <span>${colName}</span>
                    </div>
                </div>
            `;

            card.addEventListener("click", () => openDetailDrawer(img));
            container.appendChild(card);
        });
    }

    // 4. Explore Catalog (All grid)
    function renderCatalog() {
        gallery.innerHTML = "";

        const query = globalSearchInput.value.toLowerCase().trim();
        const catFilterId = catFilter.value;
        const colFilterId = colFilter.value;
        const tagFilterId = tagFilter.value;

        const filtered = currentImages.filter(img => {
            const hash = img.filename.split(".")[0];
            const meta = localMetadata.wallpaper_metadata[hash] || {};
            const col = localMetadata.collections.find(c => c.id === meta.collection_id);
            const cat = col ? localMetadata.categories.find(c => c.id === col.category_id) : null;
            const wtags = meta.tags ? localMetadata.tags.filter(t => meta.tags.includes(t.id)) : [];

            if (catFilterId && (!col || String(col.category_id) !== String(catFilterId))) {
                return false;
            }
            if (colFilterId && String(meta.collection_id) !== String(colFilterId)) {
                return false;
            }
            if (tagFilterId && (!meta.tags || !meta.tags.includes(Number(tagFilterId)))) {
                return false;
            }

            if (query) {
                const inName = img.filename.toLowerCase().includes(query);
                const inCol = col ? col.name.toLowerCase().includes(query) : false;
                const inCat = cat ? cat.name.toLowerCase().includes(query) : false;
                const inTags = wtags.some(t => t.name.toLowerCase().includes(query));
                return inName || inCol || inCat || inTags;
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
            if (isManageSlideshowMode && selectedSet.has(String(imgData.path))) {
                card.classList.add("selected");
            }

            const img = document.createElement("img");
            img.src = toFileUrl(imgData.path);

            const overlay = document.createElement("div");
            overlay.className = "overlay";

            const overlayText = document.createElement("div");
            overlayText.className = "overlay-text";
            overlayText.innerText = isManageSlideshowMode
                ? (selectedSet.has(String(imgData.path)) ? "Selected" : "Select")
                : "Set Wallpaper";

            overlay.appendChild(overlayText);
            card.appendChild(img);
            card.appendChild(overlay);

            card.addEventListener("dblclick", (e) => {
                if (isManageSlideshowMode) return;
                e.stopPropagation();
                openLightboxAt(index);
            });

            card.addEventListener("click", async () => {
                if (isManageSlideshowMode) {
                    const isSelected = !card.classList.contains("selected");
                    if (isSelected) card.classList.add("selected");
                    else card.classList.remove("selected");
                    const key = String(imgData.path);
                    if (isSelected) selectedSet.add(key);
                    else selectedSet.delete(key);
                    await window.api.toggleSelection(key, isSelected);
                    if (slideshowSelectedCount) slideshowSelectedCount.textContent = String(selectedSet.size);
                    overlayText.innerText = isSelected ? "Selected" : "Select";
                    showToast(isSelected ? "Added to favorites" : "Removed from favorites", "success");
                    return;
                }

                openDetailDrawer(imgData);
            });

            gallery.appendChild(card);
        });
    }

    // Detail Drawer Binding
    function openDetailDrawer(imgData) {
        currentSelectedImage = imgData;
        detailDrawer.classList.remove("hidden");

        drawerImage.src = toFileUrl(imgData.path);
        drawerFileName.textContent = imgData.filename;
        drawerResolution.textContent = "Loading...";
        drawerSize.textContent = "Loading...";

        const tempImg = new Image();
        tempImg.src = toFileUrl(imgData.path);
        tempImg.onload = () => {
            drawerResolution.textContent = `${tempImg.naturalWidth} x ${tempImg.naturalHeight}`;
        };

        const hash = imgData.filename.split(".")[0];
        const meta = localMetadata.wallpaper_metadata[hash] || { collection_id: null, tags: [] };
        
        const col = localMetadata.collections.find(c => c.id === meta.collection_id);
        const activeCatId = col ? col.category_id : "";
        const activeColId = col ? col.id : "";

        drawerCategorySelect.value = activeCatId;
        updateCollectionsDropdowns("", activeColId);

        renderDrawerTags(meta.tags || []);

        const isFav = selectedSet.has(String(imgData.path));
        drawerFavBtn.textContent = isFav ? "Remove Favorite" : "Add to Favorites";
    }

    function closeDetailDrawer() {
        detailDrawer.classList.add("hidden");
        currentSelectedImage = null;
    }

    function renderDrawerTags(selectedTagIds) {
        drawerTagsContainer.innerHTML = "";
        if (localMetadata.tags.length === 0) {
            drawerTagsContainer.innerHTML = '<span style="color:var(--text-muted); font-size:11px;">No tags created yet.</span>';
            return;
        }

        const createBtn = document.createElement("button");
        createBtn.type = "button";
        createBtn.className = "btn-secondary";
        createBtn.style.padding = "4px";
        createBtn.style.fontSize = "11px";
        createBtn.style.marginBottom = "8px";
        createBtn.style.width = "100%";
        createBtn.textContent = "+ Create New Tag";
        createBtn.addEventListener("click", () => openCreatorModal("tag"));
        drawerTagsContainer.appendChild(createBtn);

        localMetadata.tags.forEach(tag => {
            const row = document.createElement("div");
            row.className = "tag-checkbox-row";
            
            const isChecked = selectedTagIds.includes(Number(tag.id)) ? "checked" : "";
            row.innerHTML = `
                <input type="checkbox" id="drawerTag_${tag.id}" value="${tag.id}" ${isChecked} />
                <label for="drawerTag_${tag.id}">#${tag.name}</label>
            `;

            row.querySelector("input").addEventListener("change", saveDrawerMetadata);
            drawerTagsContainer.appendChild(row);
        });
    }

    async function saveDrawerMetadata() {
        if (!currentSelectedImage) return;

        const hash = currentSelectedImage.filename.split(".")[0];
        const colId = drawerCollectionSelect.value;
        
        const checkedTags = [];
        drawerTagsContainer.querySelectorAll("input[type=checkbox]").forEach(cb => {
            if (cb.checked) checkedTags.push(Number(cb.value));
        });

        await window.api.updateWallpaperMetadataLocally(
            hash,
            colId ? Number(colId) : null,
            checkedTags
        );

        await refreshMetadata();
        renderCatalog();
        renderRecentlyAdded();
        renderRandomDiscoveries();
        
        triggerBackgroundSync();
    }

    // Detail Action buttons bindings
    drawerApplyBtn.addEventListener("click", async () => {
        if (!currentSelectedImage) return;
        drawerApplyBtn.textContent = "Applying...";
        try {
            await window.api.setWallpaper(currentSelectedImage.path);
            showToast("Desktop wallpaper applied!", "success");
            // Check for eligibility update and prompt
            settings = await window.api.getSettings();
            checkReviewEligibility();
        } catch {
            showToast("Failed to apply wallpaper", "error");
        }
        drawerApplyBtn.textContent = "Apply Wallpaper";
    });

    drawerFavBtn.addEventListener("click", async () => {
        if (!currentSelectedImage) return;
        const key = String(currentSelectedImage.path);
        const isFav = selectedSet.has(key);
        
        await window.api.toggleSelection(key, !isFav);
        if (!isFav) {
            selectedSet.add(key);
            showToast("Added to favorites", "success");
            drawerFavBtn.textContent = "Remove Favorite";
        } else {
            selectedSet.delete(key);
            showToast("Removed from favorites", "success");
            drawerFavBtn.textContent = "Add to Favorites";
        }

        slideshowSelectedCount.textContent = String(selectedSet.size);
        loadWallpapers();
    });

    drawerDeleteBtn.addEventListener("click", async () => {
        if (!currentSelectedImage) return;
        if (confirm("Delete this local wallpaper?")) {
            await window.api.deleteWallpaper(currentSelectedImage.path);
            closeDetailDrawer();
            await loadWallpapers();
            showToast("Wallpaper deleted", "success");
        }
    });

    closeDrawerBtn.addEventListener("click", closeDetailDrawer);

    // Dropdowns changes in detail drawer
    drawerCategorySelect.addEventListener("change", async (e) => {
        const val = e.target.value;
        if (val === "CREATE_NEW_CAT") {
            openCreatorModal("category");
            drawerCategorySelect.value = "";
            return;
        }
        updateCollectionsDropdowns("", "");
        await saveDrawerMetadata();
    });

    drawerCollectionSelect.addEventListener("change", async (e) => {
        const val = e.target.value;
        if (val === "CREATE_NEW_COL") {
            openCreatorModal("collection");
            drawerCollectionSelect.value = "";
            return;
        }
        await saveDrawerMetadata();
    });

    // Inline Creator Modal Binding
    let creatorType = ""; // category, collection, tag
    function openCreatorModal(type) {
        creatorType = type;
        creatorModal.classList.remove("hidden");
        creatorModalInput.value = "";
        creatorModalInput.focus();

        if (type === "category") {
            creatorModalTitle.textContent = "Create New Category";
        } else if (type === "collection") {
            creatorModalTitle.textContent = "Create New Collection";
        } else {
            creatorModalTitle.textContent = "Create New Tag";
        }
    }

    function closeCreatorModal() {
        creatorModal.classList.add("hidden");
        creatorType = "";
    }

    creatorModalConfirm.addEventListener("click", async () => {
        const name = creatorModalInput.value.trim();
        if (!name) return;

        try {
            if (creatorType === "category") {
                const res = await window.api.createCategoryLocally(name);
                await refreshMetadata();
                drawerCategorySelect.value = res.id;
                updateCollectionsDropdowns("", "");
            } else if (creatorType === "collection") {
                const catId = drawerCategorySelect.value;
                if (!catId) return;
                const res = await window.api.createCollectionLocally(name, Number(catId));
                await refreshMetadata();
                drawerCollectionSelect.value = res.id;
            } else if (creatorType === "tag") {
                const res = await window.api.createTagLocally(name);
                await refreshMetadata();
                if (currentSelectedImage) {
                    const hash = currentSelectedImage.filename.split(".")[0];
                    const meta = localMetadata.wallpaper_metadata[hash] || { collection_id: null, tags: [] };
                    meta.tags.push(res.id);
                    await window.api.updateWallpaperMetadataLocally(hash, meta.collection_id, meta.tags);
                    await refreshMetadata();
                    openDetailDrawer(currentSelectedImage);
                }
            }
            showToast("Item created locally!", "success");
            closeCreatorModal();
            triggerBackgroundSync();
        } catch (err) {
            showToast("Failed to create item", "error");
        }
    });

    creatorModalCancel.addEventListener("click", closeCreatorModal);
    creatorModalBackdrop.addEventListener("click", closeCreatorModal);

    // Feedback / Review Modal logic
    function checkReviewEligibility() {
        const count = settings.wallpaperChangesCount || 0;
        if (count >= 5 && !settings.alreadyReviewed) {
            openReviewModal();
        }
    }

    function openReviewModal() {
        selectedRating = 0;
        reviewModal.classList.remove("hidden");
        reviewNameInput.value = "";
        reviewCommentInput.value = "";
        reviewConfirmBtn.disabled = true;

        // Reset stars styling
        const stars = ratingStarsRow.querySelectorAll(".rating-star");
        stars.forEach(s => s.classList.remove("selected"));
    }

    // Star clicking behavior
    const stars = ratingStarsRow.querySelectorAll(".rating-star");
    stars.forEach(star => {
        star.addEventListener("click", (e) => {
            const val = Number(e.target.getAttribute("data-value"));
            selectedRating = val;
            stars.forEach(s => {
                const sVal = Number(s.getAttribute("data-value"));
                if (sVal <= val) s.classList.add("selected");
                else s.classList.remove("selected");
            });
            reviewConfirmBtn.disabled = false;
        });
    });

    reviewConfirmBtn.addEventListener("click", async () => {
        reviewConfirmBtn.disabled = true;
        const name = reviewNameInput.value.trim() || "Anonymous";
        const comment = reviewCommentInput.value.trim();

        try {
            const res = await window.api.submitReview(selectedRating, comment, name);
            if (res.success) {
                showToast("Feedback submitted successfully", "success");
                reviewModal.classList.add("hidden");
                settings.alreadyReviewed = true;
            } else {
                showToast("Submission failed: " + (res.error || "Server issue"), "error");
                reviewConfirmBtn.disabled = false;
            }
        } catch (err) {
            showToast("Submission failed", "error");
            reviewConfirmBtn.disabled = false;
        }
    });

    reviewCancelBtn.addEventListener("click", async () => {
        await window.api.submitReview(0, "", ""); // rating = 0 local reset counter
        settings.wallpaperChangesCount = 0;
        reviewModal.classList.add("hidden");
        showToast("Reminding you later", "success");
    });

    reviewModalBackdrop.addEventListener("click", () => {
        // Equivalent to Maybe Later
        reviewCancelBtn.click();
    });

    // Sidebar Toggling Hamburger button
    toggleSidebarBtn.addEventListener("click", () => {
        appLayout.classList.toggle("sidebar-collapsed");
    });

    // Filters event listeners
    catFilter.addEventListener("change", () => {
        updateCollectionsDropdowns("", "");
        renderCatalog();
    });
    colFilter.addEventListener("change", renderCatalog);
    tagFilter.addEventListener("change", renderCatalog);
    
    clearFiltersBtn.addEventListener("click", () => {
        catFilter.value = "";
        colFilter.value = "";
        colFilter.disabled = true;
        tagFilter.value = "";
        globalSearchInput.value = "";
        renderCatalog();
    });

    globalSearchInput.addEventListener("input", renderCatalog);

    // Sync metadata click bindings
    syncMetadataBtn.addEventListener("click", async () => {
        syncMetadataBtn.disabled = true;
        syncMetadataBtn.textContent = "Syncing...";
        await triggerBackgroundSync();
        syncMetadataBtn.textContent = "Sync Metadata";
        syncMetadataBtn.disabled = false;
    });

    // Smart Slideshow parameter updates
    intervalDropdown.addEventListener("change", async (e) => {
        const interval = parseInt(e.target.value, 10);
        await window.api.updateInterval(interval);
        settings.slideshowInterval = interval;
        updatePlayerStatusText();
    });

    slideshowSourceType.addEventListener("change", async () => {
        populateSlideshowSourceOptions();
        await saveSlideshowSettings();
    });

    slideshowSourceId.addEventListener("change", saveSlideshowSettings);
    slideshowOrder.addEventListener("change", async (e) => {
        const order = e.target.value;
        await window.api.updateSlideshowOrder(order);
        settings.slideshowOrder = order;
        updatePlayerStatusText();
    });

    async function saveSlideshowSettings() {
        const type = slideshowSourceType.value;
        const id = slideshowSourceId.value;
        const source = { type, id: id ? Number(id) : null };
        await window.api.updateSlideshowSource(source);
        settings.slideshowSource = source;
        updatePlayerStatusText();
    }

    // Physical Slideshow player control buttons
    playerPlayBtn.addEventListener("click", async () => {
        await window.api.toggleSlideshow(true);
        settings.slideshow = true;
        setSlideshowPlaybackUI(true);
        showToast("Slideshow started", "success");
    });

    playerPauseBtn.addEventListener("click", async () => {
        await window.api.toggleSlideshow(false);
        settings.slideshow = false;
        setSlideshowPlaybackUI(false);
        showToast("Slideshow paused", "success");
    });

    playerNextBtn.addEventListener("click", async () => {
        playerNextBtn.disabled = true;
        setSyncProgress(0);
        try {
            const result = await window.api.syncNow();
            setSyncProgress(100);
            await updateWallpaperInfo();
            await loadWallpapers();
            
            // Check for eligibility update and prompt
            settings = await window.api.getSettings();
            checkReviewEligibility();
            
            showToast("Rotated next slideshow wallpaper", "success");
        } catch (e) {
            showToast("Failed to rotate: " + e.message, "error");
        }
        playerNextBtn.disabled = false;
    });

    // Collapsible Panels togglers
    toggleSlideshowSettingsBtn.addEventListener("click", () => {
        slideshowSettingsPanel.classList.toggle("hidden");
        toggleSlideshowSettingsBtn.querySelector(".chevron-icon").classList.toggle("rotated");
    });

    toggleMaintenanceBtn.addEventListener("click", () => {
        maintenancePanel.classList.toggle("hidden");
        toggleMaintenanceBtn.querySelector(".chevron-icon").classList.toggle("rotated");
    });

    // Lightbox Modal Controls
    const lightbox = document.getElementById("lightbox");
    const lightboxBackdrop = document.getElementById("lightboxBackdrop");
    const lightboxClose = document.getElementById("lightboxClose");
    const lightboxImage = document.getElementById("lightboxImage");
    const lightboxPrev = document.getElementById("lightboxPrev");
    const lightboxNext = document.getElementById("lightboxNext");
    let lightboxOpen = false;
    let lightboxIndex = -1;

    function setLightboxOpen(open) {
        lightboxOpen = !!open;
        if (!lightbox) return;
        if (lightboxOpen) {
            lightbox.classList.remove("hidden");
            document.body.style.overflow = "hidden";
        } else {
            lightbox.classList.add("hidden");
            document.body.style.overflow = "";
            lightboxIndex = -1;
        }
        updateLightboxNavState();
    }

    function updateLightboxNavState() {
        const hasMany = currentImages.length > 1;
        const isOpen = !!lightboxOpen;
        if (lightboxPrev) lightboxPrev.style.display = (isOpen && hasMany) ? "" : "none";
        if (lightboxNext) lightboxNext.style.display = (isOpen && hasMany) ? "" : "none";
    }

    function showLightboxAt(index) {
        if (!lightboxImage || currentImages.length === 0) return;
        const safeIndex = Math.max(0, Math.min(currentImages.length - 1, Number(index) || 0));
        lightboxIndex = safeIndex;
        lightboxImage.src = toFileUrl(currentImages[safeIndex].path);
        updateLightboxNavState();
    }

    function openLightboxAt(index) {
        setLightboxOpen(true);
        showLightboxAt(index);
    }

    function closeLightbox() {
        setLightboxOpen(false);
        if (lightboxImage) lightboxImage.src = "";
    }

    lightboxBackdrop.addEventListener("click", closeLightbox);
    lightboxClose.addEventListener("click", closeLightbox);
    lightboxPrev.addEventListener("click", () => {
        showLightboxAt((lightboxIndex - 1 + currentImages.length) % currentImages.length);
    });
    lightboxNext.addEventListener("click", () => {
        showLightboxAt((lightboxIndex + 1) % currentImages.length);
    });

    document.addEventListener("keydown", (e) => {
        if (!lightboxOpen) return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowRight") showLightboxAt((lightboxIndex + 1) % currentImages.length);
        if (e.key === "ArrowLeft") showLightboxAt((lightboxIndex - 1) % currentImages.length);
    });

    // Favorites Multi-select Mode
    manageSlideshowBtn.addEventListener("click", () => {
        setManageMode(true);
    });

    manageDoneBtn.addEventListener("click", () => {
        setManageMode(false);
    });

    function setManageMode(enabled) {
        isManageSlideshowMode = !!enabled;
        gallerySubheader.style.display = isManageSlideshowMode ? "flex" : "none";
        manageSlideshowBtn.textContent = isManageSlideshowMode ? "Editing..." : "Manage Favorites";
        renderCatalog();
    }

    // Toast notifications
    function showToast(message, type = "error") {
        const toastContainer = document.getElementById("toastContainer");
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;

        const icon = type === "success"
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

        toast.innerHTML = `${icon} ${message}`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("fade-out");
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Scroll optimization wheel
    function enableSmoothWheelScroll(el) {
        if (!el) return;
        try {
            const media = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
            if (media && media.matches) return;
        } catch {}

        let targetTop = el.scrollTop;
        let startTop = el.scrollTop;
        let startTime = 0;
        let rafId = 0;
        const durationMs = 380;
        const scrollMultiplier = 1.1;

        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        function clampScrollTop(v) {
            const max = Math.max(0, el.scrollHeight - el.clientHeight);
            return Math.max(0, Math.min(max, v));
        }

        function tick(now) {
            const elapsed = now - startTime;
            const t = Math.max(0, Math.min(1, elapsed / durationMs));
            const eased = easeOutCubic(t);
            el.scrollTop = startTop + (targetTop - startTop) * eased;

            if (t < 1) {
                rafId = requestAnimationFrame(tick);
            } else {
                rafId = 0;
                el.scrollTop = targetTop;
            }
        }

        el.addEventListener("wheel", (e) => {
            if (e.ctrlKey || Math.abs(e.deltaY) < 0.01 || e.deltaMode === 0) return;
            if (el.scrollHeight <= el.clientHeight + 1) return;

            let deltaY = e.deltaY;
            if (e.deltaMode === 1) deltaY *= 16;
            else if (e.deltaMode === 2) deltaY *= el.clientHeight;
            deltaY *= scrollMultiplier;

            const max = Math.max(0, el.scrollHeight - el.clientHeight);
            if ((el.scrollTop <= 0.5 && deltaY < 0) || (el.scrollTop >= max - 0.5 && deltaY > 0)) return;

            e.preventDefault();
            startTop = el.scrollTop;
            targetTop = clampScrollTop(targetTop + deltaY);
            startTime = performance.now();

            if (!rafId) rafId = requestAnimationFrame(tick);
        }, { passive: false });
    }

    // Stats updates
    async function updateWallpaperInfo() {
        const countObj = await window.api.getWallpaperCount();
        if (wallpaperCountElement) {
            wallpaperCountElement.textContent = String(countObj.count || 0);
        }
    }

    function setSyncProgress(percent) {
        const safe = Math.max(0, Math.min(100, Number(percent) || 0));
        if (syncProgressElement) syncProgressElement.textContent = `${Math.round(safe)}%`;
        if (syncProgressBarFill) syncProgressBarFill.style.width = `${safe}%`;
    }

    // Render updates widget UI elements
    function renderUpdateUI(state) {
        if (!state) return;
        if (state.checking) {
            updateStatusText.textContent = "Checking...";
            checkUpdatesBtn.style.display = "none";
            downloadUpdateBtn.style.display = "none";
            installUpdateBtn.style.display = "none";
        } else if (state.available) {
            updateStatusText.textContent = `Update v${state.version} available`;
            checkUpdatesBtn.style.display = "none";
            downloadUpdateBtn.style.display = "";
            installUpdateBtn.style.display = "none";
        } else if (state.downloaded) {
            updateStatusText.textContent = "Ready to install";
            checkUpdatesBtn.style.display = "none";
            downloadUpdateBtn.style.display = "none";
            installUpdateBtn.style.display = "";
        } else {
            updateStatusText.textContent = "Up to date";
            checkUpdatesBtn.style.display = "";
            downloadUpdateBtn.style.display = "none";
            installUpdateBtn.style.display = "none";
        }
    }

    // Register electron global listeners
    if (window.api.onDownloadProgress) {
        window.api.onDownloadProgress((percent) => setSyncProgress(percent));
    }
    if (window.api.onSyncComplete) {
        window.api.onSyncComplete(() => loadWallpapers());
    }
    if (window.api.onAppError) {
        window.api.onAppError((msg) => showToast(msg, "error"));
    }

    // Listen for update state broadcasts
    if (window.api.onUpdateState) {
        window.api.onUpdateState((state) => renderUpdateUI(state));
    }

    // Listen for tray show restore window event
    if (window.api.onWindowShown) {
        window.api.onWindowShown(async () => {
            console.log("App window shown from tray. Executing server connection reachability check...");
            await triggerBackgroundSync();
        });
    }

    // Clear local files
    if (clearLocalBtn) {
        clearLocalBtn.addEventListener("click", async () => {
            const ok = confirm("This will delete all locally cached wallpapers. Continue?");
            if (!ok) return;
            await window.api.clearLocalWallpapers();
            await loadWallpapers();
            await updateWallpaperInfo();
            showToast("Local wallpapers cleared", "success");
        });
    }

    // Fetch wallpapers
    if (fetchWallpapersBtn) {
        fetchWallpapersBtn.addEventListener("click", async () => {
            fetchWallpapersBtn.disabled = true;
            fetchWallpapersBtn.textContent = "Fetching...";
            setSyncProgress(0);
            try {
                const res = await window.api.fetchFromServer();
                setSyncProgress(100);
                await loadWallpapers();
                await updateWallpaperInfo();
                showToast(res.downloadCount > 0 ? `Downloaded ${res.downloadCount} wallpaper(s).` : "Already up to date.", "success");
            } catch (e) {
                showToast("Fetch failed: " + e.message, "error");
            }
            fetchWallpapersBtn.textContent = "Fetch server wallpapers";
            fetchWallpapersBtn.disabled = false;
        });
    }

    // Check updates manually in header
    if (checkUpdatesBtn && window.api.checkForUpdates) {
        checkUpdatesBtn.addEventListener("click", async () => {
            await window.api.checkForUpdates();
        });
    }

    // Download/Install header links
    if (downloadUpdateBtn && window.api.downloadUpdate) {
        downloadUpdateBtn.addEventListener("click", async () => {
            downloadUpdateBtn.disabled = true;
            downloadUpdateBtn.textContent = "Downloading...";
            await window.api.downloadUpdate();
        });
    }
    if (installUpdateBtn && window.api.installUpdate) {
        installUpdateBtn.addEventListener("click", async () => {
            await window.api.installUpdate();
        });
    }

    // Trigger loading
    await init();
});
