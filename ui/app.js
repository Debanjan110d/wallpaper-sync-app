// Main Application Entry Point and Coordinator (ES Module)
import { store } from "./store.js";
import {
    toFileUrl,
    showToast,
    enableSmoothWheelScroll,
    makeDragScrollable,
    updateNavButtonsVisibility
} from "./modules/utils.js";
import {
    populateFiltersAndDropdowns,
    updateCollectionsDropdowns,
    renderCategorySection,
    renderCatalog,
    showLightboxAt,
    closeLightbox,
    resetFiltersUI
} from "./modules/gallery.js";
import { initDrawer, closeDetailDrawer } from "./modules/drawer.js";
import { initPlayer, setSlideshowPlaybackUI, updatePlayerStatusText } from "./modules/player.js";
import { initReviewModal, checkReviewEligibility, updateMetadataSyncUI } from "./modules/modal.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Initial Setup and Lifecycles
    async function init() {
        store.state.settings = await window.api.getSettings();

        // 1. Initial setup of slideshow intervals & controls
        const intervalDropdown = document.getElementById("intervalDropdown");
        if (intervalDropdown) {
            intervalDropdown.value = store.state.settings.slideshowInterval || 10000;
        }

        const slideshowSourceType = document.getElementById("slideshowSourceType");
        if (slideshowSourceType && store.state.settings.slideshowSource) {
            slideshowSourceType.value = store.state.settings.slideshowSource.type || "all";
        }

        const slideshowOrder = document.getElementById("slideshowOrder");
        if (slideshowOrder) {
            slideshowOrder.value = store.state.settings.slideshowOrder || "sequential";
        }



        // Fetch local cache and sync connection status
        await store.refreshMetadata();
        await store.loadWallpapers();
        await store.updateWallpaperInfo();

        // Sync slides button state based on loaded settings
        setSlideshowPlaybackUI(!!store.state.settings.slideshow);

        // Trigger background sync on initial startup
        store.triggerBackgroundSync();

        // Check rating prompt eligibility on startup
        checkReviewEligibility();

        // Attach scroll optimization
        enableSmoothWheelScroll(document.getElementById("dashboardBody"));

        // Attach navigation behaviors to scroll rows and slider
        initScrollRowsNavigation();

        // Load initial update checker state
        if (window.api.getUpdateState) {
            const state = await window.api.getUpdateState();
            renderUpdateUI(state);
        }

        // Render app version in credit footer
        if (window.api.getAppVersion) {
            try {
                const version = await window.api.getAppVersion();
                const sidebarCredit = document.getElementById("sidebarCredit");
                if (sidebarCredit) {
                    sidebarCredit.innerHTML = `v${version} · Made by <a href="https://github.com/Debanjan110d" target="_blank" class="credit-link">Debanjan Dutta</a>`;
                }
            } catch (err) {
                console.error("Failed to render app version:", err);
            }
        }
    }

    // Initialize module event listeners
    initDrawer();
    initPlayer();
    initReviewModal();

    // Attach basic page event listeners
    const colFilter = document.getElementById("colFilter");
    const tagFilter = document.getElementById("tagFilter");
    const clearFiltersBtn = document.getElementById("clearFiltersBtn");
    const headerBackBtn = document.getElementById("headerBackBtn");
    const globalSearchInput = document.getElementById("globalSearchInput");

    if (colFilter) {
        colFilter.addEventListener("change", renderCatalog);
    }
    if (tagFilter) {
        tagFilter.addEventListener("change", renderCatalog);
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", () => {
            resetFiltersUI();
            updateCollectionsDropdowns("", "");
            renderCatalog();
        });
    }

    if (headerBackBtn) {
        headerBackBtn.addEventListener("click", () => {
            resetFiltersUI();
            updateCollectionsDropdowns("", "");
            renderCatalog();
            document.getElementById("dashboardBody")?.scrollTo({ top: 0, behavior: "smooth" });
        });
        headerBackBtn.addEventListener("mouseenter", () => {
            headerBackBtn.style.background = "rgba(255,255,255,0.15)";
        });
        headerBackBtn.addEventListener("mouseleave", () => {
            headerBackBtn.style.background = "rgba(255,255,255,0.08)";
        });
    }

    if (globalSearchInput) {
        globalSearchInput.addEventListener("input", renderCatalog);
    }

    // Toggler panels
    const toggleSlideshowSettingsBtn = document.getElementById("toggleSlideshowSettingsBtn");
    const slideshowSettingsPanel = document.getElementById("slideshowSettingsPanel");
    const toggleMaintenanceBtn = document.getElementById("toggleMaintenanceBtn");
    const maintenancePanel = document.getElementById("maintenancePanel");
    const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
    const appLayout = document.getElementById("appLayout");

    if (toggleSlideshowSettingsBtn && slideshowSettingsPanel) {
        toggleSlideshowSettingsBtn.addEventListener("click", () => {
            slideshowSettingsPanel.classList.toggle("hidden");
            toggleSlideshowSettingsBtn.querySelector(".chevron-icon")?.classList.toggle("rotated");
        });
    }

    if (toggleMaintenanceBtn && maintenancePanel) {
        toggleMaintenanceBtn.addEventListener("click", () => {
            maintenancePanel.classList.toggle("hidden");
            toggleMaintenanceBtn.querySelector(".chevron-icon")?.classList.toggle("rotated");
        });
    }

    if (toggleSidebarBtn && appLayout) {
        toggleSidebarBtn.addEventListener("click", () => {
            appLayout.classList.toggle("sidebar-collapsed");
        });
    }

    // Maintenance click triggers
    const syncMetadataBtn = document.getElementById("syncMetadataBtn");
    const metadataSyncModal = document.getElementById("metadataSyncModal");
    const metadataSyncSuccessActions = document.getElementById("metadataSyncSuccessActions");
    const metadataSyncSpinner = document.getElementById("metadataSyncSpinner");
    const metadataSyncProgressFill = document.getElementById("metadataSyncProgressFill");
    const metadataSyncProgressBar = document.getElementById("metadataSyncProgressBar");
    const metadataSyncStatus = document.getElementById("metadataSyncStatus");
    const metadataSyncCloseBtn = document.getElementById("metadataSyncCloseBtn");
    const clearLocalBtn = document.getElementById("clearLocalBtn");
    const fetchWallpapersBtn = document.getElementById("fetchWallpapersBtn");

    if (syncMetadataBtn) {
        syncMetadataBtn.addEventListener("click", async () => {
            store.state.isManualSyncInProgress = true;

            // Show sync status modal
            metadataSyncModal?.classList.remove("hidden");
            if (metadataSyncSuccessActions) metadataSyncSuccessActions.style.display = "none";
            if (metadataSyncSpinner) {
                metadataSyncSpinner.style.display = "flex";
                metadataSyncSpinner.style.animation = "spin 1.2s linear infinite";
                metadataSyncSpinner.style.borderColor = "rgba(255,255,255,0.05)";
                metadataSyncSpinner.style.borderTopColor = "var(--accent)";
                metadataSyncSpinner.innerHTML = "";
            }
            if (metadataSyncProgressFill) metadataSyncProgressFill.style.display = "block";
            if (metadataSyncProgressBar) metadataSyncProgressBar.style.width = "0%";
            if (metadataSyncStatus) metadataSyncStatus.textContent = "Initializing sync...";
            if (metadataSyncCloseBtn) metadataSyncCloseBtn.disabled = true;

            syncMetadataBtn.disabled = true;
            syncMetadataBtn.textContent = "Syncing...";

            try {
                await store.triggerBackgroundSync();
            } catch (err) {
                console.error("Manual sync failed:", err);
            }

            syncMetadataBtn.textContent = "Sync Metadata";
            syncMetadataBtn.disabled = false;
        });
    }

    if (metadataSyncCloseBtn) {
        metadataSyncCloseBtn.addEventListener("click", () => {
            metadataSyncModal?.classList.add("hidden");
            store.state.isManualSyncInProgress = false;
        });
    }

    if (clearLocalBtn) {
        clearLocalBtn.addEventListener("click", async () => {
            const ok = confirm("This will delete all locally cached wallpapers. Continue?");
            if (!ok) return;
            await window.api.clearLocalWallpapers();
            await store.loadWallpapers();
            await store.updateWallpaperInfo();
            showToast("Local wallpapers cleared", "success");
        });
    }

    if (fetchWallpapersBtn) {
        fetchWallpapersBtn.addEventListener("click", async () => {
            fetchWallpapersBtn.disabled = true;
            fetchWallpapersBtn.textContent = "Fetching...";
            store.setSyncProgress(0);
            try {
                const res = await window.api.fetchFromServer();
                store.setSyncProgress(100);
                await store.loadWallpapers();
                await store.updateWallpaperInfo();
                showToast(res.downloadCount > 0 ? `Downloaded ${res.downloadCount} wallpaper(s).` : "Already up to date.", "success");
            } catch (e) {
                showToast("Fetch failed: " + e.message, "error");
            }
            fetchWallpapersBtn.textContent = "Fetch server wallpapers";
            fetchWallpapersBtn.disabled = false;
        });
    }



    // Lightbox Modal Controls
    const lightboxBackdrop = document.getElementById("lightboxBackdrop");
    const lightboxClose = document.getElementById("lightboxClose");
    const lightboxPrev = document.getElementById("lightboxPrev");
    const lightboxNext = document.getElementById("lightboxNext");

    if (lightboxBackdrop) lightboxBackdrop.addEventListener("click", closeLightbox);
    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightboxPrev) {
        lightboxPrev.addEventListener("click", () => {
            const currentImages = store.state.currentImages || [];
            showLightboxAt((store.state.lightboxIndex - 1 + currentImages.length) % currentImages.length);
        });
    }
    if (lightboxNext) {
        lightboxNext.addEventListener("click", () => {
            const currentImages = store.state.currentImages || [];
            showLightboxAt((store.state.lightboxIndex + 1) % currentImages.length);
        });
    }

    document.addEventListener("keydown", (e) => {
        const currentImages = store.state.currentImages || [];
        if (!store.state.lightboxOpen) return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowRight") showLightboxAt((store.state.lightboxIndex + 1) % currentImages.length);
        if (e.key === "ArrowLeft") showLightboxAt((store.state.lightboxIndex - 1) % currentImages.length);
    });

    // Horizontal Row Scroll & Keys navigators
    function initScrollRowsNavigation() {
        const recentlyAddedRow = document.getElementById("recentlyAddedRow");
        const randomRow = document.getElementById("randomRow");
        const heroSliderSection = document.getElementById("heroSliderSection");

        // Drag scroll logic
        const categoriesGrid = document.getElementById("categoriesGrid");
        if (recentlyAddedRow) makeDragScrollable(recentlyAddedRow);
        if (randomRow) makeDragScrollable(randomRow);
        if (categoriesGrid) makeDragScrollable(categoriesGrid);

        // Hover tracking
        const trackHover = (el) => {
            if (!el) return;
            el.addEventListener("mouseenter", () => { store.state.activeHoveredElement = el; });
            el.addEventListener("mouseleave", () => { if (store.state.activeHoveredElement === el) store.state.activeHoveredElement = null; });
        };
        trackHover(recentlyAddedRow);
        trackHover(randomRow);
        trackHover(categoriesGrid);
        trackHover(heroSliderSection);

        // Navigation button mappings
        const wireRowButtons = (row, prevBtn, nextBtn) => {
            if (!row || !prevBtn || !nextBtn) return;
            prevBtn.addEventListener("click", () => {
                row.scrollBy({ left: -300, behavior: "smooth" });
            });
            nextBtn.addEventListener("click", () => {
                row.scrollBy({ left: 300, behavior: "smooth" });
            });
        };
        wireRowButtons(recentlyAddedRow, document.getElementById("recentlyAddedPrevBtn"), document.getElementById("recentlyAddedNextBtn"));
        wireRowButtons(randomRow, document.getElementById("randomPrevBtn"), document.getElementById("randomNextBtn"));
        wireRowButtons(categoriesGrid, document.getElementById("categoriesPrevBtn"), document.getElementById("categoriesNextBtn"));

        // Auto scrolling rows math
        const startRowAutoScroll = (row, speed = 1, intervalMs = 45) => {
            if (!row) return;
            let direction = 1;

            setInterval(() => {
                if (store.state.activeHoveredElement === row || row.classList.contains("active-dragging")) {
                    return;
                }

                const maxScroll = row.scrollWidth - row.clientWidth;
                if (maxScroll <= 0) return;

                row.scrollLeft += speed * direction;

                if (row.scrollLeft >= maxScroll - 1) {
                    direction = -1;
                } else if (row.scrollLeft <= 1) {
                    direction = 1;
                }
            }, intervalMs);
        };

        if (recentlyAddedRow) startRowAutoScroll(recentlyAddedRow);
        if (randomRow) startRowAutoScroll(randomRow);
    }

    // Global Keydown arrow keys listener for scrolling rows or active slides
    document.addEventListener("keydown", (e) => {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) {
            return;
        }

        if (!store.state.activeHoveredElement) return;

        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();

            const heroSliderSection = document.getElementById("heroSliderSection");
            if (store.state.activeHoveredElement === heroSliderSection) {
                const slides = heroSliderSection?.querySelectorAll(".hero-slide");
                if (slides && slides.length > 1) {
                    let nextIdx;
                    if (e.key === "ArrowLeft") {
                        nextIdx = (store.state.sliderActiveIndex - 1 + slides.length) % slides.length;
                    } else {
                        nextIdx = (store.state.sliderActiveIndex + 1) % slides.length;
                    }
                    import("./modules/slider.js").then(m => m.setActiveSlide(nextIdx));
                }
            } else {
                const scrollAmount = 300;
                if (e.key === "ArrowLeft") {
                    store.state.activeHoveredElement.scrollBy({ left: -scrollAmount, behavior: "smooth" });
                } else {
                    store.state.activeHoveredElement.scrollBy({ left: scrollAmount, behavior: "smooth" });
                }
            }
        }
    });

    // Resize handlers
    window.addEventListener("resize", () => {
        updateNavButtonsVisibility(
            document.getElementById("recentlyAddedRow"),
            document.getElementById("recentlyAddedPrevBtn"),
            document.getElementById("recentlyAddedNextBtn")
        );
        updateNavButtonsVisibility(
            document.getElementById("randomRow"),
            document.getElementById("randomPrevBtn"),
            document.getElementById("randomNextBtn")
        );
        updateNavButtonsVisibility(
            document.getElementById("categoriesGrid"),
            document.getElementById("categoriesPrevBtn"),
            document.getElementById("categoriesNextBtn")
        );
    });

    // Top Header updater widgets
    const updateStatusText = document.getElementById("updateStatusText");
    const checkUpdatesBtn = document.getElementById("checkUpdatesBtn");
    const downloadUpdateBtn = document.getElementById("downloadUpdateBtn");
    const installUpdateBtn = document.getElementById("installUpdateBtn");

    function renderUpdateUI(state) {
        if (!state || !updateStatusText) return;
        if (state.checking) {
            updateStatusText.textContent = "Checking...";
            if (checkUpdatesBtn) checkUpdatesBtn.style.display = "none";
            if (downloadUpdateBtn) downloadUpdateBtn.style.display = "none";
            if (installUpdateBtn) installUpdateBtn.style.display = "none";
        } else if (state.available) {
            updateStatusText.textContent = `Update v${state.version} available`;
            if (checkUpdatesBtn) checkUpdatesBtn.style.display = "none";
            if (downloadUpdateBtn) downloadUpdateBtn.style.display = "";
            if (installUpdateBtn) installUpdateBtn.style.display = "none";
        } else if (state.downloaded) {
            updateStatusText.textContent = "Ready to install";
            if (checkUpdatesBtn) checkUpdatesBtn.style.display = "none";
            if (downloadUpdateBtn) downloadUpdateBtn.style.display = "none";
            if (installUpdateBtn) installUpdateBtn.style.display = "";
        } else {
            updateStatusText.textContent = "Up to date";
            if (checkUpdatesBtn) checkUpdatesBtn.style.display = "";
            if (downloadUpdateBtn) downloadUpdateBtn.style.display = "none";
            if (installUpdateBtn) installUpdateBtn.style.display = "none";
        }
    }

    if (checkUpdatesBtn && window.api.checkForUpdates) {
        checkUpdatesBtn.addEventListener("click", async () => {
            await window.api.checkForUpdates();
        });
    }
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

    // Register electron IPC global listeners
    if (window.api.onDownloadProgress) {
        window.api.onDownloadProgress((percent) => store.setSyncProgress(percent));
    }
    if (window.api.onSyncComplete) {
        window.api.onSyncComplete(async () => {
            await store.refreshMetadata();
            await store.loadWallpapers();
            const { startProgressRingCountdown } = await import("./modules/player.js");
            startProgressRingCountdown();
        });
    }
    if (window.api.onAppError) {
        window.api.onAppError((msg) => showToast(msg, "error"));
    }
    if (window.api.onMetadataSyncProgress) {
        window.api.onMetadataSyncProgress((data) => updateMetadataSyncUI(data));
    }
    if (window.api.onUpdateState) {
        window.api.onUpdateState((state) => renderUpdateUI(state));
    }
    if (window.api.onWindowShown) {
        window.api.onWindowShown(async () => {
            console.log("App window shown from tray. Executing server connection reachability check...");
            await store.triggerBackgroundSync();
        });
    }

    // Drag and Drop Logic
    const dropZone = document.getElementById("dropZoneOverlay");
    let dragCounter = 0;

    if (dropZone) {
        document.addEventListener("dragenter", (e) => {
            e.preventDefault();
            dragCounter++;
            const appLayout = document.getElementById("appLayout");
            if (appLayout) appLayout.classList.add("drag-active");
            dropZone.classList.remove("hidden");
            dropZone.classList.add("drag-over-active");
        });

        document.addEventListener("dragover", (e) => {
            e.preventDefault();
        });

        document.addEventListener("dragleave", (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                const appLayout = document.getElementById("appLayout");
                if (appLayout) appLayout.classList.remove("drag-active");
                dropZone.classList.remove("drag-over-active");
                setTimeout(() => {
                    if (dragCounter === 0) dropZone.classList.add("hidden");
                }, 400);
            }
        });

        document.addEventListener("drop", async (e) => {
            e.preventDefault();
            dragCounter = 0;
            const appLayout = document.getElementById("appLayout");
            if (appLayout) appLayout.classList.remove("drag-active");
            dropZone.classList.remove("drag-over-active");
            dropZone.classList.add("hidden");

            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            if (files.length > 0) {
                const fileDataArray = [];
                for (const file of files) {
                    try {
                        const buffer = await file.arrayBuffer();
                        fileDataArray.push({ name: file.name, data: buffer });
                    } catch (err) {
                        console.error("Error reading dragged file:", file.name, err);
                    }
                }
                if (fileDataArray.length > 0 && window.api.uploadWallpapers) {
                    try {
                        await window.api.uploadWallpapers(fileDataArray);
                        await store.loadWallpapers();
                        await store.updateWallpaperInfo();
                        showToast(`Uploaded ${fileDataArray.length} wallpaper(s)`, "success");
                    } catch (err) {
                        showToast("Upload failed: " + err.message, "error");
                    }
                }
            }
        });
    }

    // Initialize application execution
    await init();
});
