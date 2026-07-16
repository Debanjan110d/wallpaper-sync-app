// Feedback review and library metadata sync progress modals
import { store } from "../store.js";
import { showToast } from "./utils.js";

let selectedRating = 0;

// 1. Review Prompt Modal Logic
export function checkReviewEligibility() {
    const settings = store.state.settings;
    const count = settings.wallpaperChangesCount || 0;
    if (count >= 5 && !settings.alreadyReviewed) {
        openReviewModal();
    }
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

    if (reviewCancelBtn) {
        reviewCancelBtn.addEventListener("click", async () => {
            await window.api.submitReview(0, "", ""); // rating = 0 resets local counter
            store.state.settings.wallpaperChangesCount = 0;
            reviewModal?.classList.add("hidden");
            showToast("Reminding you later", "success");
        });
    }

    if (reviewModalBackdrop && reviewCancelBtn) {
        reviewModalBackdrop.addEventListener("click", () => {
            reviewCancelBtn.click();
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
