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
    resetFiltersUI,
    openAllCollectionsModal
} from "./modules/gallery.js";
import { initDrawer, closeDetailDrawer } from "./modules/drawer.js";
import { initPlayer, setSlideshowPlaybackUI, updatePlayerStatusText } from "./modules/player.js";
import { initReviewModal, checkReviewEligibility, updateMetadataSyncUI, openReviewModal, initSettingsModal, openSettingsModal } from "./modules/modal.js";
import { initQuickActions } from "./modules/quickActions.js";
import { initControlPanel, syncRightControlPanelState } from "./modules/controlPanel.js";
import { initShortcuts } from "./modules/shortcuts.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Initial Setup and Lifecycles
    async function init() {
        store.state.settings = await window.api.getSettings();
        initSettingsModal();

        // 1. Initial setup of slideshow intervals & controls
        const currentInterval = store.state.settings.slideshowInterval || 1800000;
        const intervalDropdown = document.getElementById("intervalDropdown");
        if (intervalDropdown) {
            intervalDropdown.value = currentInterval;
        }
        syncRightControlPanelState();

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
    initQuickActions();
    initControlPanel();
    initShortcuts();

    // Setup Sidebar Tab Navigation
    function setActiveNavTab(activeId) {
        document.querySelectorAll(".sidebar-nav-section .nav-item").forEach(item => {
            if (item.id === activeId) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });
    }

    const navHome = document.getElementById("navHome");
    const navDiscover = document.getElementById("navDiscover");
    const navCollections = document.getElementById("navCollections");
    const navLibrary = document.getElementById("navLibrary");
    const navFavorites = document.getElementById("navFavorites");
    const navPlaylists = document.getElementById("navPlaylists");
    const navHistory = document.getElementById("navHistory");

    if (navHome) {
        navHome.addEventListener("click", () => {
            setActiveNavTab("navHome");
            resetFiltersUI();
            closeDetailDrawer();
            updateCollectionsDropdowns("", "");
            renderCatalog();
            document.getElementById("dashboardBody")?.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    if (navDiscover) {
        navDiscover.addEventListener("click", () => {
            setActiveNavTab("navDiscover");
            resetFiltersUI();
            updateCollectionsDropdowns("", "");
            renderCatalog();
            document.getElementById("catalogSection")?.scrollIntoView({ behavior: "smooth" });
            if (globalSearchInput) {
                globalSearchInput.focus();
                globalSearchInput.select();
            }
        });
    }

    if (navCollections) {
        navCollections.addEventListener("click", () => {
            setActiveNavTab("navCollections");
            openAllCollectionsModal();
        });
    }

    if (navLibrary) {
        navLibrary.addEventListener("click", () => {
            setActiveNavTab("navLibrary");
            resetFiltersUI();
            store.state.showLibraryOnly = true;
            renderCatalog();
            document.getElementById("dashboardBody")?.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    if (navFavorites) {
        navFavorites.addEventListener("click", () => {
            setActiveNavTab("navFavorites");
            resetFiltersUI();
            store.state.showFavoritesOnly = true;
            renderCatalog();
            document.getElementById("dashboardBody")?.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // Sidebar Collapse Controls
    const collapseSidebarBtn = document.getElementById("collapseSidebarBtn");
    if (collapseSidebarBtn) {
        collapseSidebarBtn.addEventListener("click", () => {
            const layout = document.getElementById("appLayout");
            if (layout) {
                layout.classList.toggle("sidebar-collapsed");
                const isCollapsed = layout.classList.contains("sidebar-collapsed");
                localStorage.setItem("ws_sidebar_collapsed", isCollapsed ? "1" : "0");
            }
        });
    }
    if (localStorage.getItem("ws_sidebar_collapsed") === "1") {
        document.getElementById("appLayout")?.classList.add("sidebar-collapsed");
    }

    // Right Control Panel Toggle Controls
    const btnToggleControlPanel = document.getElementById("btnToggleControlPanel");
    const closeRightPanelBtn = document.getElementById("closeRightPanelBtn");

    function toggleRightControlPanel(forceOpen) {
        const layout = document.getElementById("appLayout");
        if (!layout) return;
        if (typeof forceOpen === "boolean") {
            layout.classList.toggle("right-panel-collapsed", !forceOpen);
        } else {
            layout.classList.toggle("right-panel-collapsed");
        }
        const isCollapsed = layout.classList.contains("right-panel-collapsed");
        localStorage.setItem("ws_right_panel_collapsed", isCollapsed ? "1" : "0");
        if (btnToggleControlPanel) {
            btnToggleControlPanel.classList.toggle("active", !isCollapsed);
        }
    }

    if (btnToggleControlPanel) {
        btnToggleControlPanel.addEventListener("click", () => toggleRightControlPanel());
    }
    if (closeRightPanelBtn) {
        closeRightPanelBtn.addEventListener("click", () => toggleRightControlPanel(false));
    }
    const savedRightPanelState = localStorage.getItem("ws_right_panel_collapsed");
    // Collapse by default so it does not obstruct the gallery viewport
    const shouldCollapseRight = savedRightPanelState !== null ? savedRightPanelState === "1" : true;
    if (shouldCollapseRight) {
        document.getElementById("appLayout")?.classList.add("right-panel-collapsed");
        if (btnToggleControlPanel) btnToggleControlPanel.classList.remove("active");
    } else {
        document.getElementById("appLayout")?.classList.remove("right-panel-collapsed");
        if (btnToggleControlPanel) btnToggleControlPanel.classList.add("active");
    }

    // Light / Dark Theme Management
    const btnThemeToggle = document.getElementById("btnThemeToggle");
    const savedTheme = localStorage.getItem("ws_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);

    if (btnThemeToggle) {
        btnThemeToggle.addEventListener("click", () => {
            const current = document.documentElement.getAttribute("data-theme") || "dark";
            const next = current === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem("ws_theme", next);
            updateThemeIcon(next);
            showToast(`Theme: ${next === "light" ? "Light Mode" : "Dark Mode"}`, "info");
        });
    }

    function updateThemeIcon(theme) {
        const darkIcon = document.querySelector(".theme-icon-dark");
        const lightIcon = document.querySelector(".theme-icon-light");
        if (darkIcon && lightIcon) {
            darkIcon.style.display = theme === "dark" ? "block" : "none";
            lightIcon.style.display = theme === "light" ? "block" : "none";
        }
    }

    // Common DOM Elements
    const globalSearchInput = document.getElementById("globalSearchInput");
    const clearSearchBtn = document.getElementById("clearSearchBtn");
    const toolSettings = document.getElementById("toolSettings");
    const colFilter = document.getElementById("colFilter");
    const tagFilter = document.getElementById("tagFilter");
    const clearFiltersBtn = document.getElementById("clearFiltersBtn");
    const headerBackBtn = document.getElementById("headerBackBtn");

    // Search Clear Button Trigger
    if (clearSearchBtn && globalSearchInput) {
        globalSearchInput.addEventListener("input", () => {
            if (globalSearchInput.value.trim().length > 0) {
                clearSearchBtn.classList.remove("hidden");
            } else {
                clearSearchBtn.classList.add("hidden");
            }
        });
        clearSearchBtn.addEventListener("click", () => {
            globalSearchInput.value = "";
            clearSearchBtn.classList.add("hidden");
            renderCatalog();
            globalSearchInput.focus();
        });
    }

    if (toolSettings) {
        toolSettings.addEventListener("click", () => {
            openSettingsModal();
        });
    }

    // Permanent Review Trigger from Left Sidebar
    const toolReview = document.getElementById("toolReview");
    if (toolReview) {
        toolReview.addEventListener("click", () => {
            openReviewModal();
        });
    }

    // Interactive Notification Center Flyout with Live Dynamic Data
    const btnNotifications = document.getElementById("btnNotifications");
    const notificationsFlyout = document.getElementById("notificationsFlyout");
    const notifDot = document.getElementById("notifDot");
    const notifMarkReadBtn = document.getElementById("notifMarkReadBtn");
    const notifOpenReviewBtn = document.getElementById("notifOpenReviewBtn");
    const notifOpenSettingsBtn = document.getElementById("notifOpenSettingsBtn");
    const btnHelp = document.getElementById("btnHelp");

    function renderNotificationsList(notifications = []) {
        const notifList = document.getElementById("notifList");
        const notifCountBadge = document.getElementById("notifCountBadge");
        if (!notifList) return;

        const count = notifications.length;
        if (notifCountBadge) {
            notifCountBadge.textContent = String(count);
            notifCountBadge.style.display = count > 0 ? "inline-block" : "none";
        }
        if (notifDot) {
            if (count > 0) notifDot.classList.remove("hidden");
            else notifDot.classList.add("hidden");
        }

        notifList.innerHTML = "";

        if (count === 0) {
            notifList.innerHTML = `
                <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 12px;">
                    <div style="font-size: 24px; margin-bottom: 8px;">✓</div>
                    <div>You're all caught up!</div>
                    <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">No new notifications or update alerts.</div>
                </div>
            `;
            return;
        }

        notifications.forEach((item) => {
            const card = document.createElement("div");
            card.className = "notif-item highlight";

            const iconMap = {
                updates: "🚀",
                wallpapers: "🖼️",
                watchdog: "🛡️",
                review: "⭐",
            };
            const icon = iconMap[item.type] || "🔔";

            let actionHtml = "";
            if (item.action === "download-update") {
                actionHtml = `<button class="notif-action-btn" type="button">⬇️ Download Update</button>`;
            } else if (item.action === "sync-library" || item.type === "wallpapers") {
                actionHtml = `<button class="notif-action-btn" type="button">🔄 Sync Now</button>`;
            } else if (item.action === "review" || item.type === "review") {
                actionHtml = `<button class="notif-action-btn" type="button">★ Write Review</button>`;
            }

            card.innerHTML = `
                <div class="notif-icon-circle">${icon}</div>
                <div class="notif-body">
                    <div class="notif-item-title">${item.title}</div>
                    <div class="notif-item-text">${item.body}</div>
                    ${actionHtml}
                </div>
            `;

            const actionBtn = card.querySelector(".notif-action-btn");
            if (actionBtn) {
                actionBtn.addEventListener("click", async () => {
                    notificationsFlyout?.classList.add("hidden");
                    if (item.action === "download-update") {
                        await window.api.downloadUpdate();
                    } else if (item.action === "sync-library" || item.type === "wallpapers") {
                        await store.triggerBackgroundSync(true);
                    } else if (item.action === "review" || item.type === "review") {
                        openReviewModal();
                    }
                });
            }

            notifList.appendChild(card);
        });
    }

    if (window.api && window.api.getNotifications) {
        window.api.getNotifications().then(items => {
            if (Array.isArray(items)) renderNotificationsList(items);
        }).catch(() => {});
    }

    if (window.api && window.api.onNotificationsUpdate) {
        window.api.onNotificationsUpdate((items) => {
            if (Array.isArray(items)) renderNotificationsList(items);
        });
    }

    if (btnNotifications && notificationsFlyout) {
        btnNotifications.addEventListener("click", (e) => {
            e.stopPropagation();
            notificationsFlyout.classList.toggle("hidden");
            const isOpen = !notificationsFlyout.classList.contains("hidden");
            btnNotifications.setAttribute("aria-expanded", isOpen ? "true" : "false");
            if (isOpen && notifDot) {
                notifDot.classList.add("hidden");
            }
        });

        // Close on click outside
        document.addEventListener("click", (e) => {
            if (!notificationsFlyout.classList.contains("hidden") && !notificationsFlyout.contains(e.target) && e.target !== btnNotifications) {
                notificationsFlyout.classList.add("hidden");
                btnNotifications.setAttribute("aria-expanded", "false");
            }
        });

        // Close on Escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !notificationsFlyout.classList.contains("hidden")) {
                notificationsFlyout.classList.add("hidden");
                btnNotifications.setAttribute("aria-expanded", "false");
            }
        });
    }

    if (notifMarkReadBtn) {
        notifMarkReadBtn.addEventListener("click", async () => {
            if (notifDot) notifDot.classList.add("hidden");
            const countBadge = document.getElementById("notifCountBadge");
            if (countBadge) countBadge.textContent = "0";
            if (window.api && window.api.clearNotifications) {
                await window.api.clearNotifications();
            }
            renderNotificationsList([]);
            notificationsFlyout?.classList.add("hidden");
            showToast("Notifications marked as read", "info");
        });
    }

    if (notifOpenReviewBtn) {
        notifOpenReviewBtn.addEventListener("click", () => {
            notificationsFlyout?.classList.add("hidden");
            openReviewModal();
        });
    }

    if (notifOpenSettingsBtn) {
        notifOpenSettingsBtn.addEventListener("click", () => {
            notificationsFlyout?.classList.add("hidden");
            openSettingsModal();
        });
    }

    if (btnHelp) {
        btnHelp.addEventListener("click", () => {
            import("./modules/quickActions.js").then(m => m.openHealthCheckModal());
        });
    }

    // Global Ctrl+K Shortcut to focus search bar
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            if (globalSearchInput) {
                globalSearchInput.focus();
                globalSearchInput.select();
            }
        }
    });

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
            updateStatusText.textContent = state.currentVersion ? `Up to date (v${state.currentVersion})` : "Up to date";
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
    if (window.api.onWallpaperChanged) {
        window.api.onWallpaperChanged((data) => {
            store.state.settings.activeWallpaper = data.path;
            import("./modules/controlPanel.js").then((m) => {
                m.updateNowPlayingCard({ path: data.path, filename: data.filename });
            });
            // Update active ring on matching card in DOM in-place
            document.querySelectorAll(".wallpaper-card").forEach((card) => {
                if (card.dataset.path === data.path) {
                    card.classList.add("active-applied");
                } else {
                    card.classList.remove("active-applied");
                }
            });
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
