// Right-Side Control Panel Coordinator (Slideshow, Now Playing, System Status, Watchdog)
import { store } from "../store.js";
import { toFileUrl, showToast } from "./utils.js";
import { setSlideshowPlaybackUI, updatePlayerStatusText } from "./player.js";
import { updateQuickActionSlideshowUI } from "./quickActions.js";
import { openSettingsModal } from "./modal.js";

let statusUpdateTimer = null;

export function initControlPanel() {
    initRightSlideshowControls();
    initWatchdogCard();
    initCloudSyncCard();
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

    const rightAutoSyncToggle = document.getElementById("rightAutoSyncToggle");
    if (rightAutoSyncToggle && store.state.settings) {
        rightAutoSyncToggle.checked = store.state.settings.autoSync !== false;
    }
}

export function initCloudSyncCard() {
    const rightAutoSyncToggle = document.getElementById("rightAutoSyncToggle");
    const rightSyncNowBtn = document.getElementById("rightSyncNowBtn");
    const rightOpenSettingsBtn = document.getElementById("rightOpenSettingsBtn");

    if (rightAutoSyncToggle) {
        rightAutoSyncToggle.checked = store.state.settings?.autoSync !== false;
        rightAutoSyncToggle.addEventListener("change", async (e) => {
            await window.api.toggleAutoSync(e.target.checked);
            const modalSwitch = document.getElementById("settingAutoSyncToggle");
            if (modalSwitch) modalSwitch.checked = e.target.checked;
            showToast(e.target.checked ? "Cloud auto-sync enabled!" : "Cloud auto-sync disabled", "info");
        });
    }

    if (rightSyncNowBtn) {
        rightSyncNowBtn.addEventListener("click", async () => {
            rightSyncNowBtn.disabled = true;
            try {
                await store.triggerBackgroundSync(true);
            } finally {
                setTimeout(() => { rightSyncNowBtn.disabled = false; }, 800);
            }
        });
    }

    if (rightOpenSettingsBtn) {
        rightOpenSettingsBtn.addEventListener("click", () => {
            openSettingsModal();
        });
    }
}

// Dynamic Adaptive Ambient Hue following the currently playing wallpaper (Hibernation-Aware)
let isAppWindowVisible = true;
let pendingAmbientWallpaper = null;
export let activeThemePalette = null;

export function getActiveThemePalette() {
    return activeThemePalette;
}

export function handleAppVisibilityChange(visible) {
    isAppWindowVisible = !!visible;
    if (isAppWindowVisible && pendingAmbientWallpaper) {
        const target = pendingAmbientWallpaper;
        pendingAmbientWallpaper = null;
        updateNowPlayingCard(target);
    }
}

function hexToRgb(hex) {
    if (!hex) return null;
    let clean = String(hex).replace("#", "").trim();
    if (clean.length === 3) clean = clean.split("").map(c => c + c).join("");
    if (clean.length !== 6) return null;
    const num = parseInt(clean, 16);
    if (isNaN(num)) return null;
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    const R = Math.round(r * 255);
    const G = Math.round(g * 255);
    const B = Math.round(b * 255);
    const hex = `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
    return { r: R, g: G, b: B, hex };
}

export async function applyAdaptiveAmbientHue(activePath, currentImg = null) {
    if (!activePath) return;

    // Hibernation guard: 0 CPU & 0 DOM operations when running in tray/background
    if (!isAppWindowVisible) {
        pendingAmbientWallpaper = currentImg || { path: activePath };
        return;
    }

    let rgb = null;
    const filename = currentImg ? currentImg.filename : activePath.split(/[\\/]/).pop();
    const hash = filename ? filename.split(".")[0] : "";
    const meta = (hash && store.state.localMetadata && store.state.localMetadata.wallpaper_metadata)
        ? store.state.localMetadata.wallpaper_metadata[hash]
        : null;

    // 1. Fast Path: Use pre-computed color from metadata cache if present
    if (meta && meta.primary_color) {
        rgb = hexToRgb(meta.primary_color);
    }

    // 2. High-Performance Fallback: Extract dominant chromatic hue via native Electron runtime
    if (!rgb && window.api && window.api.getDominantColor) {
        try {
            const res = await window.api.getDominantColor(activePath);
            if (res && typeof res.r === "number") {
                rgb = { r: res.r, g: res.g, b: res.b };
            }
        } catch {
            // Fallback silently if extraction fails
        }
    }

    if (!rgb) return;

    // 3. Derive harmonious dynamic theme palette matching wallpaper hue
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const isDark = (document.documentElement.getAttribute("data-theme") || "dark") !== "light";

    // Primary vibrant accent for interactive controls, badges, glows, active borders
    const accentSat = Math.max(hsl.s, 64);
    const accentLight = isDark ? 54 : 44;
    const primary = hslToRgb(hsl.h, accentSat, accentLight);
    const primaryHover = hslToRgb(hsl.h, accentSat, isDark ? accentLight + 8 : accentLight - 8);
    const secondary = hslToRgb((hsl.h + 24) % 360, Math.max(hsl.s - 12, 42), isDark ? 46 : 48);

    // Dark Mode surfaces subtly tinted with wallpaper hue
    const surfaceSat = Math.min(hsl.s, 22);
    const bgSurface = hslToRgb(hsl.h, surfaceSat, 14);
    const bgSurfaceElevated = hslToRgb(hsl.h, surfaceSat, 18);
    const bgSurfaceCard = hslToRgb(hsl.h, surfaceSat, 12);
    const bgApp = hslToRgb(hsl.h, Math.min(hsl.s, 16), 9);

    // Light Mode surfaces subtly tinted with wallpaper hue
    const lightBgApp = hslToRgb(hsl.h, Math.min(hsl.s, 20), 95);
    const lightSurfaceElevated = hslToRgb(hsl.h, Math.min(hsl.s, 20), 98);

    activeThemePalette = {
        primary,
        primaryHover,
        secondary,
        bgSurface,
        bgSurfaceElevated,
        bgSurfaceCard,
        bgApp,
        lightBgApp,
        lightSurfaceElevated,
        rgb,
        hsl
    };

    const root = document.documentElement;
    root.style.setProperty("--primary", primary.hex);
    root.style.setProperty("--primary-hover", primaryHover.hex);
    root.style.setProperty("--primary-glow", `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.45)`);
    root.style.setProperty("--secondary", secondary.hex);
    root.style.setProperty("--border-active", `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.6)`);
    root.style.setProperty("--border-glow", `0 0 24px rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.35)`);
    root.style.setProperty("--ambient-glow", `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.32)`);
    root.style.setProperty("--ambient-tint", `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.14)`);
    root.style.setProperty("--ambient-border", `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.45)`);
    root.style.setProperty("--ambient-rgb", `${primary.r}, ${primary.g}, ${primary.b}`);

    if (isDark) {
        root.style.setProperty("--bg-app", bgApp.hex);
        root.style.setProperty("--bg-surface", bgSurface.hex);
        root.style.setProperty("--bg-surface-elevated", bgSurfaceElevated.hex);
        root.style.setProperty("--bg-surface-card", bgSurfaceCard.hex);
        root.style.setProperty("--bg-glass", `rgba(${bgSurface.r}, ${bgSurface.g}, ${bgSurface.b}, 0.92)`);
        root.style.setProperty("--border-subtle", `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.16)`);
    } else {
        root.style.setProperty("--bg-app", lightBgApp.hex);
        root.style.setProperty("--bg-surface-elevated", lightSurfaceElevated.hex);
        root.style.setProperty("--border-subtle", `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.18)`);
    }
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

    // Hibernation guard: defer heavy DOM painting when minimized to system tray
    if (!isAppWindowVisible) {
        pendingAmbientWallpaper = explicitImg || (activePath ? { path: activePath } : null);
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
    }
    applyAdaptiveAmbientHue(activePath, currentImg);

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

