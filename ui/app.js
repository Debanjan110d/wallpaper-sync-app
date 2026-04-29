document.addEventListener("DOMContentLoaded", async () => {
    const gallery = document.getElementById("gallery");
    const autoSyncToggle = document.getElementById("autoSyncToggle");
    const slideshowToggle = document.getElementById("slideshowToggle");
    const syncNowBtn = document.getElementById("syncNowBtn");
    const intervalDropdown = document.getElementById("intervalDropdown");

    // Load initial settings
    const settings = await window.api.getSettings();
    autoSyncToggle.checked = settings.autoSync;
    slideshowToggle.checked = settings.slideshow;
    intervalDropdown.value = settings.slideshowInterval || 10000;

    // Toggle listeners
    autoSyncToggle.addEventListener("change", async (e) => {
        await window.api.toggleAutoSync(e.target.checked);
    });
    slideshowToggle.addEventListener("change", async (e) => {
        await window.api.toggleSlideshow(e.target.checked);
    });

    // Interval listener
    intervalDropdown.addEventListener("change", async (e) => {
        await window.api.updateInterval(parseInt(e.target.value, 10));
    });

    // Error Toast Logic
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
        }, 5000);
    }

    if (window.api.onAppError) {
        window.api.onAppError((message) => {
            showToast(message, "error");
        });
    }

    // Sync Now listener
    syncNowBtn.addEventListener("click", async () => {
        syncNowBtn.disabled = true;
        const originalContent = syncNowBtn.innerHTML;
        syncNowBtn.innerHTML = "Loading...";
        try {
            const result = await window.api.syncNow();
            if (result && result.error) {
                showToast("Failed to sync: " + result.error, "error");
            } else
                if (result && result.downloadCount > 0) {
                    showToast(`Successfully downloaded ${result.downloadCount} image(s)!`, "success");
                } else if (result && result.orphanedCount > 0) {
                    showToast(`Cleaned up ${result.orphanedCount} orphaned image(s).`, "success");
                } else {
                    showToast("Already up to date.", "success");
                }
        } catch (e) {
            showToast("Failed to sync: " + e.message, "error");
        }
        syncNowBtn.innerHTML = originalContent;
        syncNowBtn.disabled = false;
    });

    const fetchWallpapersBtn = document.getElementById("fetchWallpapersBtn");
    fetchWallpapersBtn.addEventListener("click", async () => {
        fetchWallpapersBtn.disabled = true;
        const originalContent = fetchWallpapersBtn.innerHTML;
        fetchWallpapersBtn.innerHTML = "Fetching...";

        try {
            const result = await window.api.fetchFromServer();
            loadWallpapers();

            if (result && result.error) {
                showToast("Failed to fetch: " + result.error, "error");
            } else
                if (result && result.downloadCount > 0) {
                    showToast(`Successfully downloaded ${result.downloadCount} image(s)!`, "success");
                } else if (result && result.orphanedCount > 0) {
                    showToast(`Cleaned up ${result.orphanedCount} orphaned image(s).`, "success");
                } else {
                    showToast("Already up to date.", "success");
                }
        } catch (e) {
            showToast("Failed to fetch: " + e.message, "error");
        }

        fetchWallpapersBtn.innerHTML = originalContent;
        fetchWallpapersBtn.disabled = false;
    });

    // Load Wallpapers
    async function loadWallpapers() {
        const images = await window.api.getWallpapers();
        const settings = await window.api.getSettings();
        const selectedImages = settings.selectedImages || [];

        gallery.innerHTML = "";

        images.forEach(imgData => {
            const card = document.createElement("div");
            card.className = "wallpaper-card";
            if (selectedImages.includes(imgData.path)) {
                card.classList.add("selected");
            }

            const img = document.createElement("img");
            img.src = `file://${imgData.path}`;

            const overlay = document.createElement("div");
            overlay.className = "overlay";

            const overlayText = document.createElement("div");
            overlayText.className = "overlay-text";
            overlayText.innerText = "Set Wallpaper";

            overlay.appendChild(overlayText);

            const cardActions = document.createElement("div");
            cardActions.className = "card-actions";

            const selectBtn = document.createElement("div");
            selectBtn.className = "action-btn select-btn";
            selectBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            selectBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const isSelected = !card.classList.contains("selected");
                if (isSelected) card.classList.add("selected");
                else card.classList.remove("selected");
                await window.api.toggleSelection(imgData.path, isSelected);
            });

            const deleteBtn = document.createElement("div");
            deleteBtn.className = "action-btn delete-btn";
            deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
            deleteBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this wallpaper?")) {
                    await window.api.deleteWallpaper(imgData.path);
                    loadWallpapers();
                }
            });

            cardActions.appendChild(selectBtn);
            cardActions.appendChild(deleteBtn);

            card.appendChild(img);
            card.appendChild(overlay);
            card.appendChild(cardActions);

            card.addEventListener("click", async () => {
                overlayText.innerText = "Applying...";
                await window.api.setWallpaper(imgData.path);
                overlayText.innerText = "Applied!";
                setTimeout(() => {
                    overlayText.innerText = "Set Wallpaper";
                }, 2000);
            });

            gallery.appendChild(card);
        });
    }

    const dropZone = document.getElementById("dropZoneOverlay");
    let dragCounter = 0;

    // Drag and Drop Logic
    document.addEventListener("dragenter", (e) => {
        e.preventDefault();
        dragCounter++;
        dropZone.classList.remove("hidden");
    });

    document.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    document.addEventListener("dragleave", (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            dropZone.classList.add("hidden");
        }
    });

    document.addEventListener("drop", async (e) => {
        e.preventDefault();
        dragCounter = 0;
        dropZone.classList.add("hidden");

        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
            const fileDataArray = [];
            for (const file of files) {
                const buffer = await file.arrayBuffer();
                fileDataArray.push({ name: file.name, data: buffer });
            }
            await window.api.uploadWallpapers(fileDataArray);
            loadWallpapers();
        }
    });

    loadWallpapers();
});
