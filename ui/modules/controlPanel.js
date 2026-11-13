// Right-Side Control Panel Coordinator (Slideshow, Now Playing, System Status, Watchdog)
import { store } from "../store.js";
import { toFileUrl, showToast } from "./utils.js";
import { setSlideshowPlaybackUI, updatePlayerStatusText } from "./player.js";
import { updateQuickActionSlideshowUI } from "./quickActions.js";

let statusUpdateTimer = null;

export function initControlPanel() {
    initRightSlideshowControls();
    initWatchdogCard();
    updateNowPlayingCard();
    updateSystemStatus();

    // Listen for wallpaper changes or sync completion to update right panel
    window.addEventListener("wallpaper:changed", (e) => {
        updateNowPlayingCard(e.detail);
        updateSystemStatus();
    });

    // Periodic system status refresh every 30 seconds
    if (statusUpdateTimer) clearInterval(statusUpdateTimer);
    statusUpdateTimer = setInterval(() => {
        updateSystemStatus();
    }, 30000);
}

// 1. Right-side Slideshow Controls
function initRightSlideshowControls() {
    const slideshowToggle = document.getElementById("rightSlideshowToggle");
    const intervalSelect = document.getElementById("rightIntervalSelect");
    const collectionSelect = document.getElementById("rightCollectionSelect");
    const nextBtn = document.getElementById("rightSlideshowNextBtn");

    if (slideshowToggle) {
        slideshowToggle.checked = !!store.state.settings.slideshow;
        slideshowToggle.addEventListener("change", async () => {
            const isChecked = slideshowToggle.checked;
            try {
                // Ensure UI interval matches backend before initiating slideshow
                if (isChecked && intervalSelect) {
                    const selectedMs = Number(intervalSelect.value) || 1800000;
                    if (selectedMs !== store.state.settings.slideshowInterval) {
                        await window.api.updateInterval(selectedMs);
                        store.state.settings.slideshowInterval = selectedMs;
                    }
                }
                await window.api.toggleSlideshow(isChecked);
                store.state.settings.slideshow = isChecked;
                setSlideshowPlaybackUI(isChecked);
                updatePlayerStatusText();
                updateQuickActionSlideshowUI(isChecked);
                showToast(isChecked ? "Slideshow started" : "Slideshow stopped", "info");
            } catch (err) {
                slideshowToggle.checked = !isChecked;
                showToast("Failed to toggle slideshow", "error");
            }
        });
    }

    // Populate collections into rightCollectionSelect
    const collectionsGroup = document.getElementById("rightSelectCollectionsGroup");
    if (collectionsGroup) {
        collectionsGroup.innerHTML = "";
        const collections = store.state.localMetadata.collections || [];
        collections.forEach(col => {
            const opt = document.createElement("option");
            opt.value = `col_${col.id}`;
            opt.textContent = `${col.name} (${col.wallpaper_count || 0})`;
            collectionsGroup.appendChild(opt);
        });
    }

    if (collectionSelect) {
        // Reflect current source
        const src = store.state.settings.slideshowSource || { type: "all" };
        if (src.type === "favorites") {
            collectionSelect.value = "favorites";
        } else if (src.type === "recent") {
            collectionSelect.value = src.count === 25 ? "recent_25" : "recent_10";
        } else if (src.type === "collection" && src.id) {
            collectionSelect.value = `col_${src.id}`;
        } else {
            collectionSelect.value = "all";
        }

        collectionSelect.addEventListener("change", async () => {
            const val = collectionSelect.value;
            let sourcePayload = { type: "all" };
            if (val === "favorites") {
                sourcePayload = { type: "favorites" };
            } else if (val === "recent_10") {
                sourcePayload = { type: "recent", count: 10 };
            } else if (val === "recent_25") {
                sourcePayload = { type: "recent", count: 25 };
            } else if (val.startsWith("col_")) {
                const colId = Number(val.replace("col_", ""));
                sourcePayload = { type: "collection", id: colId };
            }
            try {
                await window.api.updateSlideshowSource(sourcePayload);
                store.state.settings.slideshowSource = sourcePayload;
                updatePlayerStatusText();
                showToast(`Slideshow source: ${collectionSelect.options[collectionSelect.selectedIndex].text}`, "info");
            } catch (err) {
                showToast("Failed to update source", "error");
            }
        });
    }

    if (intervalSelect) {
        const savedInterval = store.state.settings.slideshowInterval;
        const validInterval = (savedInterval && Number(savedInterval) >= 10000) ? String(savedInterval) : "1800000";
        intervalSelect.value = validInterval;
        intervalSelect.addEventListener("change", async () => {
            const ms = Number(intervalSelect.value);
            try {
                await window.api.updateInterval(ms);
                store.state.settings.slideshowInterval = ms;
                updatePlayerStatusText();
                showToast(`Interval set to ${intervalSelect.options[intervalSelect.selectedIndex].text}`, "success");
            } catch (err) {
                showToast("Failed to update interval", "error");
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", async () => {
            nextBtn.disabled = true;
            try {
                await window.api.syncNow();
                showToast("Advanced to next wallpaper", "success");
            } catch (err) {
                showToast("Error advancing wallpaper", "error");
            } finally {
                setTimeout(() => { nextBtn.disabled = false; }, 600);
            }
        });
    }
}

export function syncRightControlPanelState() {
    const slideshowToggle = document.getElementById("rightSlideshowToggle");
    const intervalSelect = document.getElementById("rightIntervalSelect");
    const collectionSelect = document.getElementById("rightCollectionSelect");

    if (slideshowToggle && store.state.settings) {
        slideshowToggle.checked = !!store.state.settings.slideshow;
    }

    if (intervalSelect && store.state.settings) {
        const raw = store.state.settings.slideshowInterval;
        const valid = (raw && Number(raw) >= 10000) ? String(raw) : "1800000";
        intervalSelect.value = valid;
    }

    if (collectionSelect && store.state.settings) {
        const src = store.state.settings.slideshowSource || { type: "all" };
        if (src.type === "favorites") {
            collectionSelect.value = "favorites";
        } else if (src.type === "recent") {
            collectionSelect.value = src.count === 25 ? "recent_25" : "recent_10";
        } else if (src.type === "collection" && src.id) {
            collectionSelect.value = `col_${src.id}`;
        } else {
            collectionSelect.value = "all";
        }
    }
}

// Dynamic Adaptive Ambient Hue following the currently playing wallpaper
export function applyAdaptiveAmbientHue(imageSrc) {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
        try {
            const canvas = document.createElement("canvas");
            canvas.width = 16;
            canvas.height = 16;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, 16, 16);
            const data = ctx.getImageData(0, 0, 16, 16).data;
            let totalR = 0, totalG = 0, totalB = 0, count = 0;
            for (let i = 0; i < data.length; i += 16) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                if (brightness > 20 && brightness < 235) {
                    totalR += r;
                    totalG += g;
                    totalB += b;
                    count++;
                }
            }
            if (count > 0) {
                const avgR = Math.round(totalR / count);
                const avgG = Math.round(totalG / count);
                const avgB = Math.round(totalB / count);
                document.documentElement.style.setProperty("--ambient-glow", `rgba(${avgR}, ${avgG}, ${avgB}, 0.24)`);
                document.documentElement.style.setProperty("--ambient-tint", `rgba(${avgR}, ${avgG}, ${avgB}, 0.12)`);
                document.documentElement.style.setProperty("--ambient-border", `rgba(${avgR}, ${avgG}, ${avgB}, 0.5)`);
            }
        } catch (e) {
            // Silently fallback if canvas read is blocked
        }
    };
    img.src = imageSrc;
}

// 2. Now Playing / Currently Applied Wallpaper Card
export function updateNowPlayingCard(explicitImg = null) {
    const cardImg = document.getElementById("nowPlayingImg");
    const cardTitle = document.getElementById("nowPlayingTitle");
    const cardMeta = document.getElementById("nowPlayingMeta");
    const cardCounter = document.getElementById("nowPlayingCounter");
    const placeholder = document.getElementById("nowPlayingPlaceholder");
    const cardContent = document.getElementById("nowPlayingContent");

    const settings = store.state.settings || {};
    const images = store.state.currentImages || [];
    const activePath = explicitImg ? explicitImg.path : settings.activeWallpaper;

    if (!activePath) {
        if (placeholder) placeholder.style.display = "flex";
        if (cardContent) cardContent.style.display = "none";
        return;
    }

    const currentImg = explicitImg || images.find(img => img.path === activePath);
    const filename = currentImg ? currentImg.filename : activePath.split(/[\\/]/).pop();
    const cleanName = filename ? filename.split(".")[0] : "Desktop Wallpaper";

    if (placeholder) placeholder.style.display = "none";
    if (cardContent) cardContent.style.display = "flex";

    if (cardImg) {
        const fileUrl = toFileUrl(activePath);
        cardImg.src = fileUrl;
        applyAdaptiveAmbientHue(fileUrl);
    }
    if (cardTitle) {
        cardTitle.textContent = cleanName;
        cardTitle.title = cleanName;
    }
    if (cardMeta) {
        cardMeta.textContent = currentImg ? "Active Desktop • 4K Ultra HD" : "Active Desktop Wallpaper";
    }

    if (cardCounter && images.length > 0) {
        const idx = images.findIndex(img => img.path === activePath);
        cardCounter.textContent = idx >= 0 ? `${idx + 1} / ${images.length}` : `1 / ${images.length}`;
    }
}

// 3. System Status Telemetry
export async function updateSystemStatus() {
    const engineStatusEl = document.getElementById("statusEngine");
    const libraryCountEl = document.getElementById("statusLibraryCount");
    const lastSyncEl = document.getElementById("statusLastSync");
    const watchdogStatusEl = document.getElementById("statusWatchdog");
    const overallBadgeEl = document.getElementById("statusOverallBadge");

    const images = store.state.currentImages || [];
    if (libraryCountEl) libraryCountEl.textContent = `${images.length} files`;
    if (engineStatusEl) engineStatusEl.textContent = "Running";

    // Format relative sync time cleanly
    if (lastSyncEl) {
        const lastSyncDate = store.state.settings.lastSyncDate;
        if (!lastSyncDate) {
            lastSyncEl.textContent = "Just now";
        } else {
            const diffMin = Math.round((Date.now() - Number(lastSyncDate)) / 60000);
            if (diffMin <= 1) {
                lastSyncEl.textContent = "Just now";
            } else if (diffMin < 60) {
                lastSyncEl.textContent = `${diffMin}m ago`;
            } else if (diffMin < 1440) {
                lastSyncEl.textContent = `${Math.round(diffMin / 60)}h ago`;
            } else if (diffMin < 43200) {
                const days = Math.round(diffMin / 1440);
                lastSyncEl.textContent = `${days} day${days > 1 ? "s" : ""} ago`;
            } else {
                lastSyncEl.textContent = "Recently";
            }
        }
    }

    // Query live Watchdog state
    if (window.api.getWatchdogStatus) {
        try {
            const wd = await window.api.getWatchdogStatus();
            if (watchdogStatusEl) {
                watchdogStatusEl.textContent = wd.enabled ? "Active" : "Disabled";
                watchdogStatusEl.style.color = wd.enabled ? "var(--success)" : "var(--text-muted)";
            }
            if (overallBadgeEl) {
                overallBadgeEl.textContent = wd.enabled ? "Healthy" : "Attention";
                overallBadgeEl.className = wd.enabled ? "status-badge healthy" : "status-badge attention";
            }
        } catch {
            // fallback
        }
    }
}

// 4. Wallpaper Recovery (Watchdog) Card
function initWatchdogCard() {
    const watchdogToggle = document.getElementById("watchdogToggle");
    const watchdogSubtext = document.getElementById("watchdogSubtext");
    const watchdogBadge = document.getElementById("watchdogLiveBadge");

    if (watchdogToggle) {
        const isEnabled = store.state.settings.recoveryWatchdog !== false;
        watchdogToggle.checked = isEnabled;

        watchdogToggle.addEventListener("change", async () => {
            const enabled = watchdogToggle.checked;
            try {
                const status = await window.api.toggleWatchdog(enabled);
                store.state.settings.recoveryWatchdog = enabled;
                updateWatchdogCardUI(status);
                showToast(enabled ? "Recovery Watchdog enabled" : "Recovery Watchdog paused", "info");
            } catch (err) {
                watchdogToggle.checked = !enabled;
                showToast("Failed to toggle watchdog", "error");
            }
        });
    }

    // Listen for automatic recoveries from background service
    if (window.api.onWatchdogRecovered) {
        window.api.onWatchdogRecovered((data) => {
            console.log("[ControlPanel] Received watchdog:recovered event:", data);
            showToast("Watchdog restored wallpaper after Windows reset!", "success");
            updateNowPlayingCard({ path: data.activeWallpaper });
            updateSystemStatus();

            if (watchdogBadge) {
                watchdogBadge.innerHTML = `<span style="color:var(--success);">✓ Restored just now</span>`;
            }
        });
    }

    // Initial status fetch
    if (window.api.getWatchdogStatus) {
        window.api.getWatchdogStatus().then(status => {
            updateWatchdogCardUI(status);
        });
    }
}

function updateWatchdogCardUI(status) {
    const watchdogToggle = document.getElementById("watchdogToggle");
    const watchdogBadge = document.getElementById("watchdogLiveBadge");
    const watchdogStatusEl = document.getElementById("statusWatchdog");

    if (watchdogToggle && status) {
        watchdogToggle.checked = status.enabled;
    }

    if (watchdogBadge && status) {
        if (!status.enabled) {
            watchdogBadge.innerHTML = `<span style="color:var(--text-muted);">● Watchdog disabled</span>`;
        } else if (status.recoveryCount > 0) {
            watchdogBadge.innerHTML = `<span style="color:var(--success);">✓ Guarded (${status.recoveryCount} recoveries)</span>`;
        } else {
            watchdogBadge.innerHTML = `<span style="color:var(--success);">✓ No issues detected</span>`;
        }
    }

    if (watchdogStatusEl && status) {
        watchdogStatusEl.textContent = status.enabled ? "Active" : "Disabled";
        watchdogStatusEl.style.color = status.enabled ? "var(--success)" : "var(--text-muted)";
    }
}

