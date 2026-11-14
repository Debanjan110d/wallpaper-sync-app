// Central State Store and Lifecycle Management
import {
    populateFiltersAndDropdowns,
    renderCategorySection,
    renderRecentlyAdded,
    renderRandomDiscoveries,
    renderCatalog
} from "./modules/gallery.js";
import { renderHeroSlider } from "./modules/slider.js";
import { setSlideshowPlaybackUI, updatePlayerStatusText, populateSlideshowSourceOptions } from "./modules/player.js";
import { showToast } from "./modules/utils.js";

// Global Shared State
const state = {
    settings: {},
    localMetadata: { categories: [], collections: [], tags: [], wallpaper_metadata: {}, sync_queue: {} },
    currentImages: [],
    isManageSlideshowMode: false,
    selectedSet: new Set(),
    currentSelectedImage: null,
    sliderActiveIndex: 0,
    sliderInterval: null,
    isSliderPaused: false,
    lightboxOpen: false,
    lightboxIndex: -1,
    isManualSyncInProgress: false,
    activeHoveredElement: null,
    showFavoritesOnly: false,
};

// Lifecycle Data Fetchers and Synchronizers
export async function refreshMetadata() {
    try {
        state.localMetadata = await window.api.getMetadata();
        populateFiltersAndDropdowns();
        renderCategorySection();
        updatePlayerStatusText();
    } catch (e) {
        console.error("Failed to load local metadata:", e);
    }
}

export async function loadWallpapers() {
    const images = await window.api.getWallpapers();
    state.currentImages = Array.isArray(images) ? images : [];
    const settingsObj = await window.api.getSettings();
    state.selectedSet = new Set((settingsObj.selectedImages || []).map(String));

    const slideshowSelectedCount = document.getElementById("slideshowSelectedCount");
    if (slideshowSelectedCount) {
        slideshowSelectedCount.textContent = String(state.selectedSet.size);
    }

    const navLibraryBadge = document.getElementById("navLibraryBadge");
    if (navLibraryBadge) {
        navLibraryBadge.textContent = String(state.currentImages.length);
    }

    const navFavoritesBadge = document.getElementById("navFavoritesBadge");
    if (navFavoritesBadge) {
        navFavoritesBadge.textContent = String(state.selectedSet.size);
    }

    // Redraw lists
    renderHeroSlider();
    renderRecentlyAdded();
    renderRandomDiscoveries();
    renderCatalog();
    populateSlideshowSourceOptions();

    // Notify control panel and cards of wallpaper catalog availability
    if (typeof window !== "undefined" && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent("wallpaper:changed"));
    }
}

export async function updateWallpaperInfo() {
    const countObj = await window.api.getWallpaperCount();
    const wallpaperCountElement = document.getElementById("wallpaperCount");
    if (wallpaperCountElement) {
        wallpaperCountElement.textContent = String(countObj.count || 0);
    }
}

export async function triggerBackgroundSync(isManual = false) {
    updateConnectionDot("offline", "Syncing...");
    if (isManual) showToast("Synchronizing cloud library & wallpapers...", "info");
    try {
        const syncRes = window.api.syncFullLibrary
            ? await window.api.syncFullLibrary(isManual)
            : await window.api.syncMetadataNow();

        if (syncRes && !syncRes.error) {
            updateConnectionDot("online", "Connected");
            if (isManual) {
                if (syncRes.downloadCount > 0) {
                    showToast(`Synced! Downloaded ${syncRes.downloadCount} new 4K wallpaper(s).`, "success");
                } else {
                    showToast("Library is fully synchronized & up to date!", "success");
                }
            }
            await refreshMetadata();
            await updateWallpaperInfo();
            await loadWallpapers();
        } else {
            updateConnectionDot("unreachable", syncRes?.error || "Server offline");
            if (isManual) showToast("Sync failed: " + (syncRes?.error || "Server offline"), "error");
        }
    } catch (err) {
        updateConnectionDot("unreachable", "Sync failed");
        if (isManual) showToast("Sync failed: " + err.message, "error");
    }
}

export function updateConnectionDot(status, text) {
    const connectionStatus = document.getElementById("connectionStatus");
    if (!connectionStatus) return;
    const dot = connectionStatus.querySelector(".status-dot");
    const statusText = connectionStatus.querySelector(".status-text");

    if (dot) {
        dot.className = "status-dot";
        if (status === "online") {
            dot.classList.add("status-online");
        } else if (status === "offline") {
            dot.classList.add("status-offline");
        } else {
            dot.classList.add("status-unreachable");
        }
    }
    if (statusText) statusText.textContent = text;
}

export function setSyncProgress(percent) {
    const safe = Math.max(0, Math.min(100, Number(percent) || 0));
    const syncProgressElement = document.getElementById("syncProgress");
    const syncProgressBarFill = document.getElementById("syncProgressBarFill");
    if (syncProgressElement) syncProgressElement.textContent = `${Math.round(safe)}%`;
    if (syncProgressBarFill) syncProgressBarFill.style.width = `${safe}%`;
}

// Unified Store Object
export const store = {
    state,
    refreshMetadata,
    loadWallpapers,
    updateWallpaperInfo,
    triggerBackgroundSync,
    updateConnectionDot,
    setSyncProgress
};
