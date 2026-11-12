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

    if (healthStatusEl) {
        healthStatusEl.innerHTML = `<span style="color:var(--text-muted); font-size:12px;">Running deep diagnostics across storage, desktop engine, watchdog and network...</span>`;
    }
    if (healthBodyEl) {
        healthBodyEl.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:36px 20px; gap:14px;">
                <div class="spinner" style="width:32px; height:32px; border:3px solid rgba(255,255,255,0.08); border-top-color:var(--primary); border-radius:50%; animation:spin 0.8s linear infinite;"></div>
                <span style="font-size:13px; color:var(--text-muted); font-weight:500;">Analyzing system health &amp; telemetry...</span>
            </div>
        `;
    }

    try {
        const report = await window.api.performHealthCheck();
        renderHealthReport(report);
    } catch (err) {
        if (healthStatusEl) {
            healthStatusEl.innerHTML = `<span style="color:var(--danger); font-weight:600;">Diagnostic Scan Failed</span>`;
        }
        if (healthBodyEl) {
            healthBodyEl.innerHTML = `
                <div style="background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); border-radius:10px; padding:16px; margin-bottom:16px;">
                    <p style="color:var(--danger); font-size:13px; margin:0; line-height:1.4;">${err.message}</p>
                </div>
                <div style="display:flex; justify-content:flex-end;">
                    <button class="primary-btn" onclick="document.getElementById('healthCheckModal')?.classList.add('hidden')">Close</button>
                </div>
            `;
        }
    }
}

function renderHealthReport(report) {
    const healthStatusEl = document.getElementById("healthCheckStatus");
    const healthBodyEl = document.getElementById("healthCheckBody");
    if (!healthBodyEl) return;

    const isHealthy = report.healthy;
    const issues = report.issues || [];
    const watchdog = report.watchdogStatus || {};
    const activeWpName = report.activeWallpaper && report.activeWallpaper !== "None"
        ? report.activeWallpaper.split(/[\\/]/).pop()
        : "None configured";

    if (healthStatusEl) {
        healthStatusEl.innerHTML = isHealthy
            ? `<div class="health-banner healthy">
                <span class="health-dot healthy">●</span>
                <div>
                    <strong>All Systems Operational (100%)</strong>
                    <div style="font-size:11px; opacity:0.85; margin-top:2px;">Local library, watchdog guard and desktop sync are verified.</div>
                </div>
               </div>`
            : `<div class="health-banner warning">
                <span class="health-dot warning">▲</span>
                <div>
                    <strong>${issues.length} Optimization(s) Recommended</strong>
                    <div style="font-size:11px; opacity:0.85; margin-top:2px;">Some checks require attention. Use 1-Click Repair below.</div>
                </div>
               </div>`;
    }

    const issuesHtml = issues.length > 0 ? `
        <div class="health-issues-section">
            <span class="health-subheading">Detected Issues</span>
            <div class="health-issues-list">
                ${issues.map(iss => `
                    <div class="health-issue-item ${iss.severity}">
                        <div class="issue-icon">${iss.severity === "critical" ? "⚠️" : iss.severity === "warning" ? "⚡" : "ℹ️"}</div>
                        <div class="issue-info">
                            <span class="issue-title">${iss.title}</span>
                            <span class="issue-desc">${iss.description}</span>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    ` : "";

    healthBodyEl.innerHTML = `
        <div class="health-metrics-grid">
            <div class="health-card">
                <div class="health-card-header">
                    <span class="health-card-label">📁 Storage &amp; Integrity</span>
                    <span class="health-card-tag ${report.corruptedFiles === 0 ? "healthy" : "warning"}">
                        ${report.corruptedFiles === 0 ? "Verified" : report.corruptedFiles + " corrupt"}
                    </span>
                </div>
                <div class="health-card-metric">${report.totalFiles} <span style="font-size:13px; font-weight:500; color:var(--text-muted);">wallpapers</span></div>
                <div class="health-card-sub">${report.diskUsageMB} MB used • ${report.readableFiles} valid</div>
            </div>

            <div class="health-card">
                <div class="health-card-header">
                    <span class="health-card-label">🖥️ Active Desktop</span>
                    <span class="health-card-tag ${report.activeWallpaperValid ? "healthy" : "danger"}">
                        ${report.activeWallpaperValid ? "Active" : "Unset"}
                    </span>
                </div>
                <div class="health-card-metric" style="font-size:14px; line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${activeWpName}">
                    ${activeWpName}
                </div>
                <div class="health-card-sub">${report.activeWallpaperValid ? "File verified on disk" : "Missing from library"}</div>
            </div>

            <div class="health-card">
                <div class="health-card-header">
                    <span class="health-card-label">🛡️ Recovery Watchdog</span>
                    <span class="health-card-tag ${watchdog.enabled ? "healthy" : "muted"}">
                        ${watchdog.enabled ? "Guarding" : "Disabled"}
                    </span>
                </div>
                <div class="health-card-metric">${watchdog.recoveryCount || 0} <span style="font-size:13px; font-weight:500; color:var(--text-muted);">auto-recoveries</span></div>
                <div class="health-card-sub">Startup Login: ${report.autoStartEnabled ? "Enabled" : "Off"}</div>
            </div>

            <div class="health-card">
                <div class="health-card-header">
                    <span class="health-card-label">🌐 Cloud Network</span>
                    <span class="health-card-tag ${report.networkOnline ? "healthy" : "muted"}">
                        ${report.networkOnline ? "Online" : "Offline"}
                    </span>
                </div>
                <div class="health-card-metric">
                    ${report.networkOnline ? report.pingMs + " ms" : "Local Mode"}
                </div>
                <div class="health-card-sub">${report.networkOnline ? "Cloud catalog reachable" : "Offline library safe"}</div>
            </div>
        </div>

        <div class="health-telemetry-bar">
            <span>RAM RSS: <strong>${report.memoryRssMB} MB</strong></span>
            <span>Version: <strong>v${report.version || "5.0.0"}</strong></span>
            <span>Platform: <strong>${report.platform === "win32" ? "Windows" : report.platform}</strong></span>
        </div>

        ${issuesHtml}

        <div class="health-modal-actions">
            <button id="healthRescanBtn" class="primary-btn btn-secondary" type="button" title="Re-scan system diagnostics">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>Re-scan</span>
            </button>

            <div style="display:flex; gap:8px;">
                ${issues.length > 0 ? `
                    <button id="healthFixAllBtn" class="primary-btn btn-repair" type="button">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        <span>Optimize &amp; Repair All</span>
                    </button>
                ` : ""}
                <button id="healthCloseBtn" class="primary-btn" type="button" style="padding:8px 20px;">Done</button>
            </div>
        </div>
    `;

    const closeBtn = document.getElementById("healthCloseBtn");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            document.getElementById("healthCheckModal")?.classList.add("hidden");
        });
    }

    const rescanBtn = document.getElementById("healthRescanBtn");
    if (rescanBtn) {
        rescanBtn.addEventListener("click", async () => {
            await openHealthCheckModal();
        });
    }

    const fixAllBtn = document.getElementById("healthFixAllBtn");
    if (fixAllBtn) {
        fixAllBtn.addEventListener("click", async () => {
            fixAllBtn.disabled = true;
            fixAllBtn.innerHTML = `<span>Repairing...</span>`;
            try {
                if (window.api.fixHealthIssue) {
                    await window.api.fixHealthIssue("optimize-all");
                }
                showToast("System optimization applied successfully!", "success");
                await openHealthCheckModal();
            } catch (err) {
                showToast("Repair error: " + err.message, "error");
                fixAllBtn.disabled = false;
                fixAllBtn.innerHTML = `<span>Try Again</span>`;
            }
        });
    }
}

