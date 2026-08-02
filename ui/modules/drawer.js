// Details drawer panel component and actions binding
import { store } from "../store.js";
import { toFileUrl, showToast } from "./utils.js";
import { renderCatalog } from "./gallery.js";
import { checkReviewEligibility } from "./modal.js";

// Open details panel
export function openDetailDrawer(imgData) {
    const detailDrawer = document.getElementById("detailDrawer");
    const drawerImage = document.getElementById("drawerImage");
    const drawerFileName = document.getElementById("drawerFileName");
    const drawerResolution = document.getElementById("drawerResolution");
    const drawerSize = document.getElementById("drawerSize");
    const drawerCategoryText = document.getElementById("drawerCategoryText");
    const drawerCollectionText = document.getElementById("drawerCollectionText");

    if (!detailDrawer) return;
    store.state.currentSelectedImage = imgData;
    detailDrawer.classList.remove("hidden");

    if (drawerImage) drawerImage.src = toFileUrl(imgData.path);
    if (drawerFileName) drawerFileName.textContent = imgData.filename;
    if (drawerResolution) drawerResolution.textContent = "Loading...";
    if (drawerSize) drawerSize.textContent = "Loading...";

    const tempImg = new Image();
    tempImg.src = toFileUrl(imgData.path);
    tempImg.onload = () => {
        if (drawerResolution) drawerResolution.textContent = `${tempImg.naturalWidth} x ${tempImg.naturalHeight}`;
    };

    // Retrieve file size if possible or calculate from properties
    // We can also fetch actual file size if needed, but for now we display loading or estimated
    drawerSize.textContent = imgData.sizeBytes ? formatBytes(imgData.sizeBytes) : "N/A";

    const hash = imgData.filename.split(".")[0];
    const meta = store.state.localMetadata.wallpaper_metadata[hash] || { collection_id: null, collection_ids: [], tags: [], file_name: null };

    if (drawerFileName && meta.file_name) {
        drawerFileName.textContent = meta.file_name;
    }

    const collectionIds = Array.isArray(meta.collection_ids) ? meta.collection_ids : (meta.collection_id ? [meta.collection_id] : []);
    const matchedCols = store.state.localMetadata.collections.filter(c => collectionIds.includes(Number(c.id)));
    const collectionNames = matchedCols.map(c => c.name).join(", ");

    if (drawerCollectionText) drawerCollectionText.textContent = collectionNames || "None / Select Collection";

    renderDrawerTags(meta.tags || []);

    const isFav = store.state.selectedSet.has(String(imgData.path));
    updateFavButton(isFav);
}

export function closeDetailDrawer() {
    const detailDrawer = document.getElementById("detailDrawer");
    if (detailDrawer) {
        detailDrawer.classList.add("hidden");
    }
    store.state.currentSelectedImage = null;
}

export function updateFavButton(isFav) {
    const drawerFavBtn = document.getElementById("drawerFavBtn");
    if (!drawerFavBtn) return;
    if (isFav) {
        drawerFavBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>Remove Favorite</span>
        `;
    } else {
        drawerFavBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>Add to Favorites</span>
        `;
    }
}

export function renderDrawerTags(selectedTagIds) {
    const drawerTagsContainer = document.getElementById("drawerTagsContainer");
    if (!drawerTagsContainer) return;
    drawerTagsContainer.innerHTML = "";

    const activeTags = store.state.localMetadata.tags.filter(tag => selectedTagIds.includes(Number(tag.id)));

    if (activeTags.length === 0) {
        drawerTagsContainer.innerHTML = '<span style="color:var(--text-muted); font-size:12px;">No tags</span>';
        return;
    }

    activeTags.forEach(tag => {
        const badge = document.createElement("span");
        badge.className = "tag-badge";
        badge.textContent = tag.name;
        drawerTagsContainer.appendChild(badge);
    });
}

function formatBytes(bytes, decimals = 2) {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Bind action events
export function initDrawer() {
    const drawerApplyBtn = document.getElementById("drawerApplyBtn");
    const drawerFavBtn = document.getElementById("drawerFavBtn");
    const drawerDeleteBtn = document.getElementById("drawerDeleteBtn");
    const closeDrawerBtn = document.getElementById("closeDrawerBtn");

    if (drawerApplyBtn) {
        drawerApplyBtn.addEventListener("click", async () => {
            if (!store.state.currentSelectedImage) return;
            drawerApplyBtn.disabled = true;
            drawerApplyBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin">
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                <span>Applying...</span>
            `;
            try {
                await window.api.setWallpaper(store.state.currentSelectedImage.path);
                showToast("Desktop wallpaper applied!", "success");
                store.state.settings = await window.api.getSettings();
                checkReviewEligibility();
            } catch {
                showToast("Failed to apply wallpaper", "error");
            }
            drawerApplyBtn.disabled = false;
            drawerApplyBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <span>Apply Wallpaper</span>
            `;
        });
    }

    if (drawerFavBtn) {
        drawerFavBtn.addEventListener("click", async () => {
            if (!store.state.currentSelectedImage) return;
            const key = String(store.state.currentSelectedImage.path);
            const isFav = store.state.selectedSet.has(key);

            await window.api.toggleSelection(key, !isFav);
            if (!isFav) {
                store.state.selectedSet.add(key);
                showToast("Added to favorites", "success");
                updateFavButton(true);
            } else {
                store.state.selectedSet.delete(key);
                showToast("Removed from favorites", "success");
                updateFavButton(false);
            }

            const slideshowSelectedCount = document.getElementById("slideshowSelectedCount");
            if (slideshowSelectedCount) {
                slideshowSelectedCount.textContent = String(store.state.selectedSet.size);
            }
            await store.loadWallpapers();
        });
    }

    if (drawerDeleteBtn) {
        drawerDeleteBtn.addEventListener("click", async () => {
            if (!store.state.currentSelectedImage) return;
            if (confirm("Delete this local wallpaper?")) {
                await window.api.deleteWallpaper(store.state.currentSelectedImage.path);
                closeDetailDrawer();
                await store.loadWallpapers();
                showToast("Wallpaper deleted", "success");
            }
        });
    }

    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener("click", closeDetailDrawer);
    }
}
