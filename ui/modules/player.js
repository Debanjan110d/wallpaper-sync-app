// Slideshow Player and playback settings bindings
import { store } from "../store.js";
import { showToast } from "./utils.js";
import { renderCatalog } from "./gallery.js";

// Adjust player button visibility and status text
export function setSlideshowPlaybackUI(isPlaying) {
    const playerPlayBtn = document.getElementById("playerPlayBtn");
    const playerPauseBtn = document.getElementById("playerPauseBtn");

    if (isPlaying) {
        playerPlayBtn?.classList.add("hidden");
        playerPauseBtn?.classList.remove("hidden");
    } else {
        playerPlayBtn?.classList.remove("hidden");
        playerPauseBtn?.classList.add("hidden");
    }
    updatePlayerStatusText();
}

// Format and update slideshow status indicator text
export function updatePlayerStatusText() {
    const playerStatus = document.getElementById("playerStatus");
    if (!playerStatus) return;

    const settings = store.state.settings;
    if (settings.slideshow) {
        let sourceLabel = "All";
        const src = settings.slideshowSource || { type: "all", id: null };

        if (src.type === "favorites") {
            sourceLabel = "Favorites";
        } else if (src.type === "category" && src.id) {
            const cat = store.state.localMetadata.categories.find(c => String(c.id) === String(src.id));
            sourceLabel = cat ? cat.name : "Category";
        } else if (src.type === "collection" && src.id) {
            const col = store.state.localMetadata.collections.find(c => String(c.id) === String(src.id));
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

// Populate smart slideshow source dropdown options
export function populateSlideshowSourceOptions() {
    const slideshowSourceType = document.getElementById("slideshowSourceType");
    const slideshowSourceIdRow = document.getElementById("slideshowSourceIdRow");
    const slideshowSourceId = document.getElementById("slideshowSourceId");
    if (!slideshowSourceType || !slideshowSourceIdRow || !slideshowSourceId) return;

    const activeType = slideshowSourceType.value;
    const currentSource = store.state.settings.slideshowSource || { type: "all", id: null };

    slideshowSourceId.innerHTML = "";

    if (activeType === "category") {
        slideshowSourceIdRow.classList.remove("hidden");
        store.state.localMetadata.categories.forEach(cat => {
            const selectedAttr = (currentSource.type === "category" && String(currentSource.id) === String(cat.id)) ? "selected" : "";
            slideshowSourceId.innerHTML += `<option value="${cat.id}" ${selectedAttr}>${cat.name}</option>`;
        });
    } else if (activeType === "collection") {
        slideshowSourceIdRow.classList.remove("hidden");
        store.state.localMetadata.collections.forEach(col => {
            const categoryName = store.state.localMetadata.categories.find(c => c.id === col.category_id)?.name || "Uncategorized";
            const selectedAttr = (currentSource.type === "collection" && String(currentSource.id) === String(col.id)) ? "selected" : "";
            slideshowSourceId.innerHTML += `<option value="${col.id}" ${selectedAttr}>${col.name} (${categoryName})</option>`;
        });
    } else {
        slideshowSourceIdRow.classList.add("hidden");
    }
}

// Save Slideshow Settings
export async function saveSlideshowSettings() {
    const slideshowSourceType = document.getElementById("slideshowSourceType");
    const slideshowSourceId = document.getElementById("slideshowSourceId");
    if (!slideshowSourceType || !slideshowSourceId) return;

    const type = slideshowSourceType.value;
    const id = slideshowSourceId.value;
    const source = { type, id: id ? Number(id) : null };
    await window.api.updateSlideshowSource(source);
    store.state.settings.slideshowSource = source;
    updatePlayerStatusText();
}

// Toggle Favorites Editing Mode
export function setManageMode(enabled) {
    const gallerySubheader = document.getElementById("gallerySubheader");
    const manageSlideshowBtn = document.getElementById("manageSlideshowBtn");
    if (!gallerySubheader || !manageSlideshowBtn) return;

    store.state.isManageSlideshowMode = !!enabled;
    gallerySubheader.style.display = store.state.isManageSlideshowMode ? "flex" : "none";
    manageSlideshowBtn.textContent = store.state.isManageSlideshowMode ? "Editing..." : "Manage Favorites";
    renderCatalog();
}

// Initialize event listeners
export function initPlayer() {
    const playerPlayBtn = document.getElementById("playerPlayBtn");
    const playerPauseBtn = document.getElementById("playerPauseBtn");
    const playerNextBtn = document.getElementById("playerNextBtn");
    const intervalDropdown = document.getElementById("intervalDropdown");
    const slideshowSourceType = document.getElementById("slideshowSourceType");
    const slideshowSourceId = document.getElementById("slideshowSourceId");
    const slideshowOrder = document.getElementById("slideshowOrder");
    const manageSlideshowBtn = document.getElementById("manageSlideshowBtn");
    const manageDoneBtn = document.getElementById("manageDoneBtn");

    if (playerPlayBtn) {
        playerPlayBtn.addEventListener("click", async () => {
            await window.api.toggleSlideshow(true);
            store.state.settings.slideshow = true;
            setSlideshowPlaybackUI(true);
            showToast("Slideshow started", "success");
        });
    }

    if (playerPauseBtn) {
        playerPauseBtn.addEventListener("click", async () => {
            await window.api.toggleSlideshow(false);
            store.state.settings.slideshow = false;
            setSlideshowPlaybackUI(false);
            showToast("Slideshow paused", "success");
        });
    }

    if (playerNextBtn) {
        playerNextBtn.addEventListener("click", async () => {
            playerNextBtn.disabled = true;
            store.setSyncProgress(0);
            try {
                const result = await window.api.syncNow();
                store.setSyncProgress(100);
                await store.updateWallpaperInfo();
                await store.loadWallpapers();

                // Trigger review eligibility check after application
                store.state.settings = await window.api.getSettings();
                import("./modal.js").then(m => m.checkReviewEligibility());

                showToast("Rotated next slideshow wallpaper", "success");
            } catch (e) {
                showToast("Failed to rotate: " + e.message, "error");
            }
            playerNextBtn.disabled = false;
        });
    }

    if (intervalDropdown) {
        intervalDropdown.addEventListener("change", async (e) => {
            const interval = parseInt(e.target.value, 10);
            await window.api.updateInterval(interval);
            store.state.settings.slideshowInterval = interval;
            updatePlayerStatusText();
        });
    }

    if (slideshowSourceType) {
        slideshowSourceType.addEventListener("change", async () => {
            populateSlideshowSourceOptions();
            await saveSlideshowSettings();
        });
    }

    if (slideshowSourceId) {
        slideshowSourceId.addEventListener("change", saveSlideshowSettings);
    }

    if (slideshowOrder) {
        slideshowOrder.addEventListener("change", async (e) => {
            const order = e.target.value;
            await window.api.updateSlideshowOrder(order);
            store.state.settings.slideshowOrder = order;
            updatePlayerStatusText();
        });
    }

    if (manageSlideshowBtn) {
        manageSlideshowBtn.addEventListener("click", () => {
            setManageMode(true);
        });
    }

    if (manageDoneBtn) {
        manageDoneBtn.addEventListener("click", () => {
            setManageMode(false);
        });
    }
}
