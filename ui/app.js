document.addEventListener("DOMContentLoaded", async () => {
    const gallery = document.getElementById("gallery");
    const slideshowToggle = document.getElementById("slideshowToggle");
    const syncNowBtn = document.getElementById("syncNowBtn");
    const intervalDropdown = document.getElementById("intervalDropdown");
    const wallpaperCountElement = document.getElementById("wallpaperCount");
    const syncProgressElement = document.getElementById("syncProgress");
    const syncProgressBarFill = document.getElementById("syncProgressBarFill");
    const clearLocalBtn = document.getElementById("clearLocalBtn");

    const manageSlideshowBtn = document.getElementById("manageSlideshowBtn");
    const slideshowSelectedCount = document.getElementById("slideshowSelectedCount");
    const gallerySubheader = document.getElementById("gallerySubheader");
    const manageDoneBtn = document.getElementById("manageDoneBtn");
    const selectedPreview = document.getElementById("selectedPreview");

    const randomToggle = document.getElementById("randomToggle");

    const updateStatusText = document.getElementById("updateStatusText");
    const updateNotesText = document.getElementById("updateNotesText");
    const checkUpdatesBtn = document.getElementById("checkUpdatesBtn");
    const downloadUpdateBtn = document.getElementById("downloadUpdateBtn");
    const installUpdateBtn = document.getElementById("installUpdateBtn");

    const topUpdateBanner = document.getElementById("topUpdateBanner");
    const topUpdateText = document.getElementById("topUpdateText");
    const topUpdateActionBtn = document.getElementById("topUpdateActionBtn");

    // Load initial settings
    const settings = await window.api.getSettings();
    slideshowToggle.checked = settings.slideshow;
    if (randomToggle) randomToggle.checked = !!settings.slideshowRandom;
    intervalDropdown.value = settings.slideshowInterval || 10000;

    let isManageSlideshowMode = false;

    // Smooth wheel scrolling for the gallery (helps on Windows/Electron).
    // Disabled when the user prefers reduced motion.
    function enableSmoothWheelScroll(el) {
        if (!el) return;
        try {
            const media = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
            if (media && media.matches) return;
        } catch {
            // ignore
        }

        let targetTop = el.scrollTop;
        let startTop = el.scrollTop;
        let startTime = 0;
        let rafId = 0;
        // Higher = smoother/floatier, lower = snappier.
        const durationMs = 420;
        // Mild multiplier to make trackpads/mice feel less "staccato".
        const scrollMultiplier = 1.15;

        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        function clampScrollTop(v) {
            const max = Math.max(0, el.scrollHeight - el.clientHeight);
            return Math.max(0, Math.min(max, v));
        }

        function tick(now) {
            const elapsed = now - startTime;
            const t = Math.max(0, Math.min(1, elapsed / durationMs));
            const eased = easeOutCubic(t);
            const next = startTop + (targetTop - startTop) * eased;
            el.scrollTop = next;

            if (t < 1) {
                rafId = requestAnimationFrame(tick);
            } else {
                rafId = 0;
                el.scrollTop = targetTop;
            }
        }

        el.addEventListener(
            "wheel",
            (e) => {
                // Let zoom gestures (ctrl+wheel) and horizontal scrolling behave normally.
                if (e.ctrlKey) return;
                if (Math.abs(e.deltaY) < 0.01) return;

                // Trackpads typically emit pixel deltas (deltaMode === 0) and already feel smooth.
                // Intercepting them can feel "stuck" in responsive layouts, so only smooth
                // mouse wheel style events (line/page based).
                if (e.deltaMode === 0) return;

                // If there is nothing to scroll, do nothing.
                if (el.scrollHeight <= el.clientHeight + 1) return;

                // Normalize delta across devices/browsers.
                let deltaY = e.deltaY;
                // 0=pixel, 1=line, 2=page
                if (e.deltaMode === 1) deltaY *= 16;
                else if (e.deltaMode === 2) deltaY *= el.clientHeight;
                deltaY *= scrollMultiplier;

                const max = Math.max(0, el.scrollHeight - el.clientHeight);
                const atTop = el.scrollTop <= 0.5;
                const atBottom = el.scrollTop >= max - 0.5;
                // Don't block native behavior when user tries to scroll past edges.
                if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) return;

                e.preventDefault();

                const current = el.scrollTop;
                targetTop = clampScrollTop(targetTop + deltaY);

                // Restart animation from the current scroll position for continuity.
                startTop = current;
                startTime = performance.now();

                if (!rafId) {
                    rafId = requestAnimationFrame(tick);
                }
            },
            { passive: false }
        );
    }

    enableSmoothWheelScroll(gallery);

    // Lightbox gallery viewer (double click + arrow navigation)
    const lightbox = document.getElementById("lightbox");
    const lightboxBackdrop = document.getElementById("lightboxBackdrop");
    const lightboxClose = document.getElementById("lightboxClose");
    const lightboxImage = document.getElementById("lightboxImage");
    const lightboxPrev = document.getElementById("lightboxPrev");
    const lightboxNext = document.getElementById("lightboxNext");
    let lightboxOpen = false;
    let currentImages = [];
    let lightboxIndex = -1;

    function updateLightboxNavState() {
        const hasMany = Array.isArray(currentImages) && currentImages.length > 1;
        const isOpen = !!lightboxOpen;
        if (lightboxPrev) {
            lightboxPrev.style.display = (isOpen && hasMany) ? "" : "none";
            lightboxPrev.disabled = !hasMany;
        }
        if (lightboxNext) {
            lightboxNext.style.display = (isOpen && hasMany) ? "" : "none";
            lightboxNext.disabled = !hasMany;
        }
    }

    function toFileUrl(absolutePath) {
        if (!absolutePath) return "";
        // Windows paths may contain backslashes; file URLs require forward slashes and 3 slashes after scheme.
        // Example: C:\Users\Me\a b.jpg -> file:///C:/Users/Me/a%20b.jpg
        const normalized = String(absolutePath).replace(/\\/g, "/");
        const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
        return encodeURI(`file://${withLeadingSlash}`);
    }

    // Manage slideshow flow:
    // step 0: select/deselect
    // step 1: preview selected thumbnails, confirm to exit
    let manageStep = 0;
    let selectedSet = new Set((settings.selectedImages || []).map(String));

    function setManageMode(enabled) {
        isManageSlideshowMode = !!enabled;
        manageStep = 0;
        if (gallerySubheader) {
            gallerySubheader.style.display = isManageSlideshowMode ? "" : "none";
        }
        if (manageSlideshowBtn) {
            manageSlideshowBtn.textContent = isManageSlideshowMode ? "Managing…" : "Manage Slideshow";
        }

        if (selectedPreview) {
            selectedPreview.style.display = "none";
            selectedPreview.innerHTML = "";
        }

        if (manageDoneBtn) {
            manageDoneBtn.textContent = "Done";
        }
    }

    function setLightboxOpen(open) {
        lightboxOpen = !!open;
        if (!lightbox) return;
        if (lightboxOpen) {
            lightbox.classList.remove("hidden");
            // Prevent the background from scrolling while viewing.
            document.body.style.overflow = "hidden";
        } else {
            lightbox.classList.add("hidden");
            document.body.style.overflow = "hidden";
            lightboxIndex = -1;
        }

        updateLightboxNavState();
    }

    function showLightboxAt(index) {
        if (!lightboxImage) return;
        if (!Array.isArray(currentImages) || currentImages.length === 0) return;

        const safeIndex = Math.max(0, Math.min(currentImages.length - 1, Number(index) || 0));
        lightboxIndex = safeIndex;
        const imgData = currentImages[safeIndex];
        if (!imgData || !imgData.path) return;
        lightboxImage.src = toFileUrl(imgData.path);

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

    function showPrevLightboxImage() {
        if (!lightboxOpen) return;
        if (!Array.isArray(currentImages) || currentImages.length <= 1) return;
        showLightboxAt((lightboxIndex - 1 + currentImages.length) % currentImages.length);
    }

    function showNextLightboxImage() {
        if (!lightboxOpen) return;
        if (!Array.isArray(currentImages) || currentImages.length <= 1) return;
        showLightboxAt((lightboxIndex + 1) % currentImages.length);
    }

    if (lightboxBackdrop) {
        lightboxBackdrop.addEventListener("click", () => {
            if (!lightboxOpen) return;
            closeLightbox();
        });
    }

    if (lightboxClose) {
        lightboxClose.addEventListener("click", () => {
            if (!lightboxOpen) return;
            closeLightbox();
        });
    }

    document.addEventListener("keydown", (e) => {
        if (!lightboxOpen) return;
        if (!currentImages || currentImages.length === 0) return;

        if (e.key === "Escape") {
            e.preventDefault();
            closeLightbox();
            return;
        }

        if (e.key === "ArrowRight") {
            e.preventDefault();
            showNextLightboxImage();
            return;
        }

        if (e.key === "ArrowLeft") {
            e.preventDefault();
            showPrevLightboxImage();
            return;
        }
    });

    if (lightboxPrev) {
        lightboxPrev.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            showPrevLightboxImage();
        });
    }

    if (lightboxNext) {
        lightboxNext.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            showNextLightboxImage();
        });
    }

    if (manageSlideshowBtn) {
        manageSlideshowBtn.addEventListener("click", async () => {
            setManageMode(true);
            await loadWallpapers();
        });
    }

    if (manageDoneBtn) {
        manageDoneBtn.addEventListener("click", async () => {
            if (!isManageSlideshowMode) return;

            if (manageStep === 0) {
                // Preview step
                manageStep = 1;
                if (selectedPreview) {
                    selectedPreview.style.display = "flex";
                    selectedPreview.innerHTML = "";
                    const selected = Array.from(selectedSet);
                    for (const absolutePath of selected) {
                        if (!absolutePath) continue;

                        const item = document.createElement("div");
                        item.className = "selected-item";
                        item.title = absolutePath;

                        const thumb = document.createElement("img");
                        thumb.className = "selected-thumb";
                        thumb.alt = "Selected wallpaper";
                        thumb.src = toFileUrl(absolutePath);

                        const removeBtn = document.createElement("button");
                        removeBtn.type = "button";
                        removeBtn.className = "selected-remove";
                        removeBtn.title = "Remove from slideshow";
                        removeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
                        removeBtn.addEventListener("click", async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const key = String(absolutePath);
                            if (!selectedSet.has(key)) return;
                            selectedSet.delete(key);
                            await window.api.toggleSelection(key, false);
                            if (slideshowSelectedCount) slideshowSelectedCount.textContent = String(selectedSet.size);
                            item.remove();
                        });

                        item.appendChild(thumb);
                        item.appendChild(removeBtn);
                        selectedPreview.appendChild(item);
                    }
                }
                if (manageDoneBtn) manageDoneBtn.textContent = "Done (Confirm)";
                showToast("Review selected wallpapers above, then confirm.", "success");
                return;
            }

            // Finalize
            setManageMode(false);
            await loadWallpapers();
        });
    }

    if (randomToggle) {
        randomToggle.addEventListener("change", async (e) => {
            await window.api.toggleRandom(!!e.target.checked);
        });
    }

    // Toggle listeners
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

    function setButtonVisible(button, isVisible) {
        if (!button) return;
        button.style.display = isVisible ? "" : "none";
    }

    function renderUpdateState(state) {
        if (!updateStatusText) return;

        const supported = state && state.supported;
        const checking = !!(state && state.checking);
        const available = !!(state && state.available);
        const downloaded = !!(state && state.downloaded);
        const downloading = !!(state && state.downloading);
        const version = state && state.version ? state.version : null;
        const notes = state && state.notes ? state.notes : "";

        const shouldShowTopBanner = supported && (available || downloading || downloaded || checking);
        if (topUpdateBanner) {
            topUpdateBanner.style.display = shouldShowTopBanner ? "" : "none";
        }

        if (topUpdateText) {
            if (!supported) {
                topUpdateText.textContent = "Updates are available after install";
            } else if (checking) {
                topUpdateText.textContent = "Checking for updates…";
            } else if (available) {
                const v = version ? `v${version}` : "";
                topUpdateText.textContent = notes ? `Update available ${v} — ${notes}` : `Update available ${v}`.trim();
            } else {
                topUpdateText.textContent = "Up to date";
            }
        }

        if (topUpdateActionBtn) {
            if (!supported) {
                topUpdateActionBtn.disabled = true;
                topUpdateActionBtn.textContent = "Install required";
            } else if (available || downloaded) {
                // Download happens in the browser (direct installer download).
                topUpdateActionBtn.disabled = false;
                topUpdateActionBtn.textContent = "Download";
            } else {
                topUpdateActionBtn.disabled = checking;
                topUpdateActionBtn.textContent = checking ? "Checking…" : "Check";
            }
        }

        if (!supported) {
            updateStatusText.textContent = "Updates: available after install";
            if (updateNotesText) {
                updateNotesText.textContent = "Packaged/installed builds only.";
                updateNotesText.title = updateNotesText.textContent;
            }
            if (checkUpdatesBtn) checkUpdatesBtn.disabled = true;
            setButtonVisible(downloadUpdateBtn, false);
            setButtonVisible(installUpdateBtn, false);
            return;
        }

        if (checking) {
            updateStatusText.textContent = "Checking for updates…";
        } else if (available) {
            updateStatusText.textContent = version ? `Update available (v${version})` : "Update available";
        } else {
            updateStatusText.textContent = "Up to date";
        }

        if (updateNotesText) {
            updateNotesText.textContent = notes || "";
            updateNotesText.title = notes || "";
        }

        if (checkUpdatesBtn) checkUpdatesBtn.disabled = checking || downloading;

        setButtonVisible(downloadUpdateBtn, available && !downloaded);
        if (downloadUpdateBtn) {
            downloadUpdateBtn.disabled = downloading;
            downloadUpdateBtn.textContent = downloading ? "Downloading…" : "Download";
        }

        // No in-app install flow; installer downloads via browser.
        setButtonVisible(installUpdateBtn, false);
    }

    async function refreshUpdateState() {
        if (!window.api.getUpdateState) return;
        try {
            const state = await window.api.getUpdateState();
            renderUpdateState(state);
        } catch (err) {
            console.error("Failed to fetch update state:", err);
        }
    }

    if (checkUpdatesBtn && window.api.checkForUpdates) {
        checkUpdatesBtn.addEventListener("click", async () => {
            try {
                const state = await window.api.checkForUpdates();
                renderUpdateState(state);
                showToast("Checking for updates…", "success");
            } catch (err) {
                showToast("Update check failed: " + (err && err.message ? err.message : String(err)), "error");
            }
        });
    }

    if (downloadUpdateBtn && window.api.downloadUpdate) {
        downloadUpdateBtn.addEventListener("click", async () => {
            try {
                const state = await window.api.downloadUpdate();
                renderUpdateState(state);
                showToast("Opening download in browser…", "success");
            } catch (err) {
                showToast("Download failed: " + (err && err.message ? err.message : String(err)), "error");
            }
        });
    }

    // Intentionally no install button handler; updates are applied via installer.

    if (topUpdateActionBtn) {
        topUpdateActionBtn.addEventListener("click", async () => {
            try {
                const state = await window.api.getUpdateState();
                if (state && (state.available || state.downloaded)) {
                    const nextState = await window.api.downloadUpdate();
                    renderUpdateState(nextState);
                    showToast("Opening download in browser…", "success");
                    return;
                }
                const nextState = await window.api.checkForUpdates();
                renderUpdateState(nextState);
            } catch (err) {
                showToast("Update action failed: " + (err && err.message ? err.message : String(err)), "error");
            }
        });
    }

    if (window.api.onUpdateState) {
        window.api.onUpdateState((state) => {
            renderUpdateState(state);
        });
    }

    if (window.api.onAppError) {
        window.api.onAppError((message) => {
            showToast(message, "error");
        });
    }

    function setSyncProgress(percent) {
        const safe = Math.max(0, Math.min(100, Number(percent) || 0));
        animateSyncProgressTo(safe);
    }

    const syncProgressAnim = {
        current: 0,
        raf: 0,
        startTime: 0,
        startValue: 0,
        targetValue: 0,
        durationMs: 0,
    };

    function renderSyncProgress(value) {
        const safe = Math.max(0, Math.min(100, Number(value) || 0));
        syncProgressAnim.current = safe;
        if (syncProgressElement) syncProgressElement.textContent = `${Math.round(safe)}%`;
        if (syncProgressBarFill) syncProgressBarFill.style.width = `${safe}%`;
    }

    function animateSyncProgressTo(target) {
        const safeTarget = Math.max(0, Math.min(100, Number(target) || 0));
        const start = syncProgressAnim.current;
        const delta = Math.abs(safeTarget - start);

        // If the delta is tiny, update immediately to avoid UI lag.
        if (delta < 0.5) {
            if (syncProgressAnim.raf) cancelAnimationFrame(syncProgressAnim.raf);
            syncProgressAnim.raf = 0;
            renderSyncProgress(safeTarget);
            return;
        }

        if (syncProgressAnim.raf) cancelAnimationFrame(syncProgressAnim.raf);

        // Duration scales with delta so 0->100 doesn't snap.
        const durationMs = Math.max(240, Math.min(2200, delta * 18));

        syncProgressAnim.startTime = performance.now();
        syncProgressAnim.startValue = start;
        syncProgressAnim.targetValue = safeTarget;
        syncProgressAnim.durationMs = durationMs;

        const tick = (now) => {
            const elapsed = now - syncProgressAnim.startTime;
            const t = Math.max(0, Math.min(1, elapsed / syncProgressAnim.durationMs));

            // Ease-out quad for a natural finish.
            const eased = 1 - Math.pow(1 - t, 2);
            const value = syncProgressAnim.startValue + (syncProgressAnim.targetValue - syncProgressAnim.startValue) * eased;
            renderSyncProgress(value);

            if (t < 1) {
                syncProgressAnim.raf = requestAnimationFrame(tick);
            } else {
                syncProgressAnim.raf = 0;
                renderSyncProgress(syncProgressAnim.targetValue);
            }
        };

        syncProgressAnim.raf = requestAnimationFrame(tick);
    }

    renderSyncProgress(0);

    if (window.api.onDownloadProgress) {
        window.api.onDownloadProgress((percent) => {
            setSyncProgress(percent);
        });
    }

    const fetchWallpapersBtn = document.getElementById("fetchWallpapersBtn");
    fetchWallpapersBtn.addEventListener("click", async () => {
        fetchWallpapersBtn.disabled = true;
        const originalContent = fetchWallpapersBtn.innerHTML;
        fetchWallpapersBtn.innerHTML = "Fetching...";
        setSyncProgress(0);

        try {
            const result = await window.api.fetchFromServer();
            setSyncProgress(100);
            await updateWallpaperInfo();
            await loadWallpapers();

            if (result && result.error) {
                showToast("Failed to fetch: " + result.error, "error");
            } else
                if (result && result.downloadCount > 0) {
                    showToast(`Successfully downloaded ${result.downloadCount} image(s)!`, "success");
                } else if (result && result.serverDeletedCount > 0) {
                    showToast(`Server removed ${result.serverDeletedCount} wallpaper(s) (kept locally).`, "success");
                } else {
                    showToast("Already up to date.", "success");
                }
        } catch (e) {
            showToast("Failed to fetch: " + e.message, "error");
        }

        fetchWallpapersBtn.innerHTML = originalContent;
        fetchWallpapersBtn.disabled = false;
    });

    if (clearLocalBtn) {
        clearLocalBtn.addEventListener("click", async () => {
            const ok = confirm(
                "This will delete ALL locally downloaded wallpapers on this device and reset your slideshow selection. Continue?"
            );
            if (!ok) return;

            clearLocalBtn.disabled = true;
            const original = clearLocalBtn.textContent;
            clearLocalBtn.textContent = "Clearing…";

            try {
                const result = await window.api.clearLocalWallpapers();
                await updateWallpaperInfo();
                await loadWallpapers();

                if (result && result.success) {
                    showToast(`Cleared ${result.deletedCount || 0} local wallpaper(s).`, "success");
                } else {
                    showToast(`Clear failed: ${(result && result.error) || "Unknown error"}`, "error");
                }
            } catch (err) {
                showToast("Clear failed: " + (err && err.message ? err.message : String(err)), "error");
            }

            clearLocalBtn.textContent = original;
            clearLocalBtn.disabled = false;
        });
    }

    // Sync Now listener
    syncNowBtn.addEventListener("click", async () => {
        syncNowBtn.disabled = true;
        const originalContent = syncNowBtn.innerHTML;
        syncNowBtn.innerHTML = "Loading...";
        setSyncProgress(0);

        try {
            const result = await window.api.syncNow();
            setSyncProgress(100);
            await updateWallpaperInfo();
            await loadWallpapers();

            if (result && result.error) {
                showToast("Failed to sync: " + result.error, "error");
            } else if (result && result.downloadCount > 0) {
                showToast(`Successfully downloaded ${result.downloadCount} image(s)!`, "success");
            } else if (result && result.serverDeletedCount > 0) {
                showToast(`Server removed ${result.serverDeletedCount} wallpaper(s) (kept locally).`, "success");
            } else {
                showToast("Already up to date.", "success");
            }
        } catch (e) {
            showToast("Failed to sync: " + e.message, "error");
        }

        syncNowBtn.innerHTML = originalContent;
        syncNowBtn.disabled = false;
    });

    // Load Wallpapers
    async function loadWallpapers() {
        const images = await window.api.getWallpapers();
        currentImages = Array.isArray(images) ? images : [];
        const settings = await window.api.getSettings();
        const selectedImages = (settings.selectedImages || []).map(String);
        selectedSet = new Set(selectedImages);

        if (slideshowSelectedCount) {
            slideshowSelectedCount.textContent = String(selectedImages.length);
        }

        gallery.innerHTML = "";

        currentImages.forEach((imgData, index) => {
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

            const cardActions = document.createElement("div");
            cardActions.className = "card-actions";

            const deleteBtn = document.createElement("div");
            deleteBtn.className = "action-btn delete-btn";
            deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
            deleteBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this wallpaper?")) {
                    await window.api.deleteWallpaper(imgData.path);
                    await updateWallpaperInfo();
                    loadWallpapers();
                }
            });

            cardActions.appendChild(deleteBtn);

            card.appendChild(img);
            card.appendChild(overlay);
            card.appendChild(cardActions);

            let applyClickTimeout = 0;

            card.addEventListener("dblclick", (e) => {
                if (isManageSlideshowMode) return;
                e.preventDefault();
                e.stopPropagation();
                if (applyClickTimeout) {
                    clearTimeout(applyClickTimeout);
                    applyClickTimeout = 0;
                }
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
                    showToast(isSelected ? "Added to slideshow" : "Removed from slideshow", "success");
                    return;
                }

                if (applyClickTimeout) clearTimeout(applyClickTimeout);
                applyClickTimeout = setTimeout(async () => {
                    overlayText.innerText = "Applying...";
                    await window.api.setWallpaper(imgData.path);
                    overlayText.innerText = "Applied!";
                    setTimeout(() => {
                        overlayText.innerText = "Set Wallpaper";
                    }, 2000);
                    applyClickTimeout = 0;
                }, 220);
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
            await updateWallpaperInfo();
            loadWallpapers();
        }
    });

    async function updateWallpaperInfo() {
        try {
            const { count } = await window.api.getWallpaperCount();
            wallpaperCountElement.textContent = count;
        } catch (error) {
            console.error("Failed to fetch wallpaper count:", error);
        }
    }

    // Initial update
    updateWallpaperInfo();

    loadWallpapers();

    setManageMode(false);

    // Initial updater state
    refreshUpdateState();
});
