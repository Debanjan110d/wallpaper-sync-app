// Feedback review and library metadata sync progress modals
import { store } from "../store.js";
import { showToast } from "./utils.js";

let selectedRating = 0;

// 1. Review Prompt Modal Logic
export function checkReviewEligibility() {
    const settings = store.state.settings || {};
    
    // If user already reviewed, never prompt again
    if (settings.alreadyReviewed) {
        return;
    }

    const now = Date.now();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    // Must have used app for at least 3 days
    const firstUsedAt = settings.firstUsedAt || now;
    if (now - firstUsedAt < THREE_DAYS_MS) {
        return;
    }

    // If postponed/ignored, wait until 10 days cooldown has passed
    if (settings.reviewRemindAfter && now < settings.reviewRemindAfter) {
        return;
    }

    openReviewModal();
}

export function openReviewModal() {
    const reviewModal = document.getElementById("reviewModal");
    const reviewNameInput = document.getElementById("reviewNameInput");
    const reviewCommentInput = document.getElementById("reviewCommentInput");
    const reviewConfirmBtn = document.getElementById("reviewConfirmBtn");
    const ratingStarsRow = document.getElementById("ratingStarsRow");

    if (!reviewModal) return;
    selectedRating = 0;
    reviewModal.classList.remove("hidden");

    if (reviewNameInput) reviewNameInput.value = "";
    if (reviewCommentInput) reviewCommentInput.value = "";
    if (reviewConfirmBtn) reviewConfirmBtn.disabled = true;

    // Reset stars styling
    if (ratingStarsRow) {
        const stars = ratingStarsRow.querySelectorAll(".rating-star");
        stars.forEach(s => s.classList.remove("selected"));
    }
}

// Bind Review & Feedback actions
export function initReviewModal() {
    const ratingStarsRow = document.getElementById("ratingStarsRow");
    const reviewConfirmBtn = document.getElementById("reviewConfirmBtn");
    const reviewCancelBtn = document.getElementById("reviewCancelBtn");
    const reviewModalBackdrop = document.getElementById("reviewModalBackdrop");
    const reviewNameInput = document.getElementById("reviewNameInput");
    const reviewCommentInput = document.getElementById("reviewCommentInput");
    const reviewModal = document.getElementById("reviewModal");

    if (ratingStarsRow && reviewConfirmBtn) {
        const stars = ratingStarsRow.querySelectorAll(".rating-star");
        stars.forEach(star => {
            star.addEventListener("click", (e) => {
                const val = Number(e.target.getAttribute("data-value"));
                selectedRating = val;
                stars.forEach(s => {
                    const sVal = Number(s.getAttribute("data-value"));
                    if (sVal <= val) s.classList.add("selected");
                    else s.classList.remove("selected");
                });
                reviewConfirmBtn.disabled = false;
            });
        });
    }

    if (reviewConfirmBtn) {
        reviewConfirmBtn.addEventListener("click", async () => {
            reviewConfirmBtn.disabled = true;
            const name = reviewNameInput?.value.trim() || "Anonymous";
            const comment = reviewCommentInput?.value.trim() || "";

            try {
                const res = await window.api.submitReview(selectedRating, comment, name);
                if (res.success) {
                    showToast("Feedback submitted successfully", "success");
                    reviewModal?.classList.add("hidden");
                    store.state.settings.alreadyReviewed = true;
                } else {
                    showToast("Submission failed: " + (res.error || "Server issue"), "error");
                    reviewConfirmBtn.disabled = false;
                }
            } catch (err) {
                showToast("Submission failed", "error");
                reviewConfirmBtn.disabled = false;
            }
        });
    }

    const closeReviewModalBtn = document.getElementById("closeReviewModalBtn");
    if (closeReviewModalBtn) {
        closeReviewModalBtn.addEventListener("click", () => {
            reviewModal?.classList.add("hidden");
        });
    }

    if (reviewCancelBtn) {
        reviewCancelBtn.addEventListener("click", async () => {
            try {
                const res = await window.api.submitReview(0, "", ""); // rating = 0 snoozes
                if (res && res.remindAfter) {
                    store.state.settings.reviewRemindAfter = res.remindAfter;
                } else {
                    store.state.settings.reviewRemindAfter = Date.now() + 10 * 24 * 60 * 60 * 1000;
                }
            } catch {}
            store.state.settings.wallpaperChangesCount = 0;
            reviewModal?.classList.add("hidden");
        });
    }

    if (reviewModalBackdrop) {
        reviewModalBackdrop.addEventListener("click", () => {
            reviewModal?.classList.add("hidden");
        });
    }
}

// 2. Metadata Sync Modal Update
export function updateMetadataSyncUI(data) {
    if (!store.state.isManualSyncInProgress) return;

    const metadataSyncStatus = document.getElementById("metadataSyncStatus");
    const metadataSyncProgressBar = document.getElementById("metadataSyncProgressBar");
    const metadataSyncSpinner = document.getElementById("metadataSyncSpinner");
    const metadataSyncProgressFill = document.getElementById("metadataSyncProgressFill");
    const metadataSyncSuccessActions = document.getElementById("metadataSyncSuccessActions");
    const metadataSyncCloseBtn = document.getElementById("metadataSyncCloseBtn");

    if (!metadataSyncStatus || !metadataSyncProgressBar || !metadataSyncSpinner) return;

    const { status, percent } = data;

    metadataSyncStatus.textContent = status;
    metadataSyncProgressBar.style.width = `${percent}%`;

    if (percent === 100) {
        // Success state
        metadataSyncSpinner.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ec946" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        metadataSyncSpinner.style.animation = "none";
        metadataSyncSpinner.style.borderColor = "#2ec946";

        metadataSyncStatus.innerHTML = `<span style="color:#2ec946; font-weight:600;">${status}</span>`;
        if (metadataSyncSuccessActions) metadataSyncSuccessActions.style.display = "flex";
        if (metadataSyncCloseBtn) metadataSyncCloseBtn.disabled = false;
    } else if (status.toLowerCase().includes("failed") || status.toLowerCase().includes("unreachable")) {
        // Error state
        metadataSyncSpinner.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff453a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        metadataSyncSpinner.style.animation = "none";
        metadataSyncSpinner.style.borderColor = "#ff453a";

        metadataSyncStatus.innerHTML = `<span style="color:#ff453a; font-weight:600;">${status}</span>`;
        if (metadataSyncSuccessActions) metadataSyncSuccessActions.style.display = "flex";
        if (metadataSyncCloseBtn) metadataSyncCloseBtn.disabled = false;
    } else {
        // Normal progress state
        metadataSyncSpinner.innerHTML = "";
        metadataSyncSpinner.style.animation = "spin 1.2s linear infinite";
        metadataSyncSpinner.style.borderColor = "rgba(255,255,255,0.05)";
        metadataSyncSpinner.style.borderTopColor = "var(--accent)";
    }
}

// 3. Settings & Cloud Sync Preferences Modal
export function openSettingsModal() {
    const modal = document.getElementById("settingsModal");
    if (!modal) return;
    syncSettingsModalValues();
    modal.classList.remove("hidden");
}

export function closeSettingsModal() {
    const modal = document.getElementById("settingsModal");
    if (modal) modal.classList.add("hidden");
}

export async function syncSettingsModalValues() {
    try {
        const settings = await window.api.getSettings();
        if (!settings) return;

        const autoSyncToggle = document.getElementById("settingAutoSyncToggle");
        const syncStartupToggle = document.getElementById("settingSyncStartupToggle");
        const syncIntervalSelect = document.getElementById("settingSyncIntervalSelect");
        const notifyWallpapersToggle = document.getElementById("settingNotifyWallpapersToggle");
        const notifyUpdatesToggle = document.getElementById("settingNotifyUpdatesToggle");
        const dirPathEl = document.getElementById("settingWallpaperDirPath");
        const lastSyncLabel = document.getElementById("settingLastSyncLabel");

        if (autoSyncToggle) autoSyncToggle.checked = settings.autoSync !== false;
        if (syncStartupToggle) syncStartupToggle.checked = settings.syncOnStartup !== false;
        if (syncIntervalSelect) {
            syncIntervalSelect.value = String(settings.autoSyncInterval || "21600000");
        }
        if (notifyWallpapersToggle) notifyWallpapersToggle.checked = settings.notifyNewWallpapers !== false;
        if (notifyUpdatesToggle) notifyUpdatesToggle.checked = settings.notifyAppUpdates !== false;

        if (dirPathEl && window.api.getWallpaperDir) {
            const dir = await window.api.getWallpaperDir();
            dirPathEl.textContent = dir || "Local Wallpapers Folder";
        }

        if (lastSyncLabel && settings.lastSyncDate) {
            const dateStr = new Date(settings.lastSyncDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            lastSyncLabel.textContent = `Last sync: ${dateStr}`;
        }
    } catch (err) {
        console.warn("[Settings] Error loading settings values:", err);
    }
}

export function initSettingsModal() {
    const closeBtn = document.getElementById("closeSettingsModalBtn");
    const backdrop = document.getElementById("settingsModalBackdrop");
    const autoSyncToggle = document.getElementById("settingAutoSyncToggle");
    const syncStartupToggle = document.getElementById("settingSyncStartupToggle");
    const syncIntervalSelect = document.getElementById("settingSyncIntervalSelect");
    const notifyWallpapersToggle = document.getElementById("settingNotifyWallpapersToggle");
    const notifyUpdatesToggle = document.getElementById("settingNotifyUpdatesToggle");
    const syncNowBtn = document.getElementById("settingSyncNowActionBtn");
    const openFolderBtn = document.getElementById("settingOpenFolderBtn");
    const forceResyncBtn = document.getElementById("settingForceResyncBtn");

    if (closeBtn) closeBtn.addEventListener("click", closeSettingsModal);
    if (backdrop) backdrop.addEventListener("click", closeSettingsModal);

    if (autoSyncToggle) {
        autoSyncToggle.addEventListener("change", async (e) => {
            await window.api.toggleAutoSync(e.target.checked);
            const rightSwitch = document.getElementById("rightAutoSyncToggle");
            if (rightSwitch) rightSwitch.checked = e.target.checked;
            showToast(e.target.checked ? "Cloud auto-sync enabled!" : "Cloud auto-sync disabled", "info");
        });
    }

    if (syncStartupToggle) {
        syncStartupToggle.addEventListener("change", async (e) => {
            const settings = await window.api.getSettings();
            settings.syncOnStartup = e.target.checked;
        });
    }

    if (syncIntervalSelect) {
        syncIntervalSelect.addEventListener("change", async (e) => {
            await window.api.updateSyncInterval(Number(e.target.value));
            showToast("Sync frequency updated", "info");
        });
    }

    if (notifyWallpapersToggle) {
        notifyWallpapersToggle.addEventListener("change", async (e) => {
            await window.api.toggleNotifyWallpapers(e.target.checked);
            showToast(e.target.checked ? "Wallpaper notifications enabled" : "Wallpaper notifications muted", "info");
        });
    }

    if (notifyUpdatesToggle) {
        notifyUpdatesToggle.addEventListener("change", async (e) => {
            await window.api.toggleNotifyUpdates(e.target.checked);
            showToast(e.target.checked ? "Update notifications enabled" : "Update notifications muted", "info");
        });
    }

    if (openFolderBtn) {
        openFolderBtn.addEventListener("click", async () => {
            await window.api.openWallpaperDir();
        });
    }

    if (syncNowBtn) {
        syncNowBtn.addEventListener("click", async () => {
            syncNowBtn.disabled = true;
            const originalText = syncNowBtn.textContent;
            syncNowBtn.textContent = "Syncing...";
            try {
                await store.triggerBackgroundSync(true);
                await syncSettingsModalValues();
            } finally {
                syncNowBtn.textContent = originalText;
                syncNowBtn.disabled = false;
            }
        });
    }

    if (forceResyncBtn) {
        forceResyncBtn.addEventListener("click", async () => {
            forceResyncBtn.disabled = true;
            forceResyncBtn.textContent = "Re-syncing...";
            try {
                showToast("Starting full cloud reconcile...", "info");
                const res = await window.api.syncFullLibrary(true);
                if (res && !res.error) {
                    showToast(`Full re-sync complete! (${res.downloadCount} downloaded)`, "success");
                    await store.refreshMetadata();
                    await store.updateWallpaperInfo();
                    await store.loadWallpapers();
                    await syncSettingsModalValues();
                } else {
                    showToast("Re-sync failed: " + (res?.error || "Unknown error"), "error");
                }
            } catch (err) {
                showToast("Error: " + err.message, "error");
            } finally {
                forceResyncBtn.textContent = "⚡ Force Cloud Re-Sync";
                forceResyncBtn.disabled = false;
            }
        });
    }
}
