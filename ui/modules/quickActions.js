// Quick Actions Engine: Apply Random, Slideshow, Sync Library, Health Check
import { store } from "../store.js";
import { showToast } from "./utils.js";
import { openDetailDrawer } from "./drawer.js";
import { setSlideshowPlaybackUI, updatePlayerStatusText } from "./player.js";

export function initQuickActions() {
    const quickActionRandom = document.getElementById("quickActionRandom");
    const quickActionSlideshow = document.getElementById("quickActionSlideshow");
    const quickActionSync = document.getElementById("quickActionSync");
    const quickActionHealth = document.getElementById("quickActionHealth");

    // 1. Apply Random Wallpaper
    if (quickActionRandom) {
        quickActionRandom.addEventListener("click", async () => {
            const images = store.state.currentImages || [];
            if (images.length === 0) {
                showToast("No local wallpapers available yet. Sync or drop files first!", "error");
                return;
            }

            const currentActive = store.state.settings.activeWallpaper;
            const candidates = images.filter(img => img.path !== currentActive);
            const pool = candidates.length > 0 ? candidates : images;
            const randomImg = pool[Math.floor(Math.random() * pool.length)];

            if (!randomImg) return;

            try {
                quickActionRandom.classList.add("anim-pulse");
                await window.api.setWallpaper(randomImg.path);
                store.state.settings.activeWallpaper = randomImg.path;
                showToast(`Applied: ${randomImg.filename.split(".")[0]}`, "success");
                
                // Dispatch sync-complete to notify all cards
                if (window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent("wallpaper:changed", { detail: randomImg }));
                }
            } catch (err) {
                showToast("Failed to apply wallpaper: " + err.message, "error");
            } finally {
                setTimeout(() => quickActionRandom.classList.remove("anim-pulse"), 600);
            }
        });
    }

    // 2. Toggle Slideshow
    if (quickActionSlideshow) {
        quickActionSlideshow.addEventListener("click", async () => {
            const isRunning = !!store.state.settings.slideshow;
            const nextState = !isRunning;

            try {
                quickActionSlideshow.classList.add("anim-pulse");
                await window.api.toggleSlideshow(nextState);
                store.state.settings.slideshow = nextState;
                setSlideshowPlaybackUI(nextState);
                updatePlayerStatusText();
                updateQuickActionSlideshowUI(nextState);
                showToast(nextState ? "Slideshow started" : "Slideshow stopped", "info");
            } catch (err) {
                showToast("Failed to toggle slideshow", "error");
            } finally {
                setTimeout(() => quickActionSlideshow.classList.remove("anim-pulse"), 600);
            }
        });
    }

    // 3. Sync Library
    if (quickActionSync) {
        quickActionSync.addEventListener("click", async () => {
            quickActionSync.classList.add("anim-spin");
            showToast("Syncing library metadata...", "info");
            try {
                await store.triggerBackgroundSync();
                showToast("Library is up to date!", "success");
            } catch (err) {
                showToast("Sync error: " + err.message, "error");
            } finally {
                setTimeout(() => quickActionSync.classList.remove("anim-spin"), 1000);
            }
        });
    }

    // 4. System Health Check
    if (quickActionHealth) {
        quickActionHealth.addEventListener("click", async () => {
            await openHealthCheckModal();
        });
    }

    // Initial state reflection
    updateQuickActionSlideshowUI(!!store.state.settings.slideshow);
}

export function updateQuickActionSlideshowUI(isRunning) {
    const quickActionSlideshow = document.getElementById("quickActionSlideshow");
    if (!quickActionSlideshow) return;

    const title = quickActionSlideshow.querySelector(".quick-action-title");
    const sub = quickActionSlideshow.querySelector(".quick-action-sub");
    if (title) title.textContent = isRunning ? "Pause Slideshow" : "Start Slideshow";
    if (sub) sub.textContent = isRunning ? "Slideshow is running" : "Auto change wallpapers";

    if (isRunning) {
        quickActionSlideshow.classList.add("active");
    } else {
        quickActionSlideshow.classList.remove("active");
    }
}

export async function openHealthCheckModal() {
    const modal = document.getElementById("healthCheckModal");
    if (!modal) return;

    modal.classList.remove("hidden");
    const healthStatusEl = document.getElementById("healthCheckStatus");
    const healthBodyEl = document.getElementById("healthCheckBody");

    if (healthStatusEl) healthStatusEl.textContent = "Scanning files and services...";
    if (healthBodyEl) {
        healthBodyEl.innerHTML = `
            <div style="display:flex; justify-content:center; padding:30px;">
                <div class="spinner" style="width:28px; height:28px; border:3px solid var(--border-subtle); border-top-color:var(--primary); border-radius:50%; animation:spin 0.8s linear infinite;"></div>
            </div>
        `;
    }

    try {
        const report = await window.api.performHealthCheck();
        renderHealthReport(report);
    } catch (err) {
        if (healthStatusEl) healthStatusEl.textContent = "Health check failed";
        if (healthBodyEl) {
            healthBodyEl.innerHTML = `<p style="color:var(--danger); padding:16px;">Error: ${err.message}</p>`;
        }
    }
}

function renderHealthReport(report) {
    const healthStatusEl = document.getElementById("healthCheckStatus");
    const healthBodyEl = document.getElementById("healthCheckBody");
    if (!healthBodyEl) return;

    const isHealthy = report.healthy;
    if (healthStatusEl) {
        healthStatusEl.innerHTML = isHealthy
            ? `<span style="color:var(--success); font-weight:600;">● System Healthy & Optimized</span>`
            : `<span style="color:var(--warning); font-weight:600;">▲ Optimization Recommended</span>`;
    }

    const watchdog = report.watchdogStatus || {};
    const activeWpName = report.activeWallpaper && report.activeWallpaper !== "None"
        ? report.activeWallpaper.split(/[\\/]/).pop()
        : "None selected";

    healthBodyEl.innerHTML = `
        <div class="health-metrics-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
            <div class="health-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:10px; padding:12px;">
                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Local Wallpapers</div>
                <div style="font-size:20px; font-weight:700; color:var(--text-main); margin-top:4px;">${report.totalFiles} files</div>
                <div style="font-size:11px; color:var(--success); margin-top:2px;">${report.readableFiles} readable</div>
            </div>
            <div class="health-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:10px; padding:12px;">
                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Disk Space Used</div>
                <div style="font-size:20px; font-weight:700; color:var(--text-main); margin-top:4px;">${report.diskUsageMB} MB</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Offline Cache</div>
            </div>
        </div>

        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:10px; padding:14px; margin-bottom:16px; font-size:12px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="color:var(--text-muted);">Active Wallpaper:</span>
                <span style="font-weight:600; color:var(--text-main); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${activeWpName}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="color:var(--text-muted);">Recovery Watchdog:</span>
                <span style="font-weight:600; color:${watchdog.enabled ? "var(--success)" : "var(--text-muted)"};">${watchdog.enabled ? "Active & Guarding" : "Disabled"}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-muted);">Auto-Recoveries:</span>
                <span style="font-weight:600; color:var(--primary);">${watchdog.recoveryCount || 0} times</span>
            </div>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button id="healthCloseBtn" class="primary-btn" style="padding:8px 18px; font-size:12px; border-radius:8px;">Done</button>
        </div>
    `;

    const closeBtn = document.getElementById("healthCloseBtn");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            document.getElementById("healthCheckModal")?.classList.add("hidden");
        });
    }
}

