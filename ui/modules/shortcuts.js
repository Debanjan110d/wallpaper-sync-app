// Keyboard Shortcuts Manager for Wallpaper Sync
import { store } from "../store.js";
import { showToast } from "./utils.js";
import { setSlideshowPlaybackUI, updatePlayerStatusText } from "./player.js";
import { updateQuickActionSlideshowUI } from "./quickActions.js";
import { closeDetailDrawer } from "./drawer.js";

export function initShortcuts() {
    const shortcutsModal = document.getElementById("shortcutsModal");
    const shortcutsModalBackdrop = document.getElementById("shortcutsModalBackdrop");
    const closeShortcutsModalBtn = document.getElementById("closeShortcutsModalBtn");
    const btnHelp = document.getElementById("btnHelp");

    function openShortcutsModal() {
        if (shortcutsModal) {
            shortcutsModal.classList.remove("hidden");
        }
    }

    function closeShortcutsModal() {
        if (shortcutsModal) {
            shortcutsModal.classList.add("hidden");
        }
    }

    if (btnHelp) {
        btnHelp.addEventListener("click", () => {
            openShortcutsModal();
        });
    }

    if (closeShortcutsModalBtn) {
        closeShortcutsModalBtn.addEventListener("click", closeShortcutsModal);
    }
    if (shortcutsModalBackdrop) {
        shortcutsModalBackdrop.addEventListener("click", closeShortcutsModal);
    }

    // Global Keydown Listener
    window.addEventListener("keydown", async (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
        const isInputFocused = activeTag === "input" || activeTag === "textarea" || activeTag === "select";

        // Escape: Close any open modal or drawer
        if (e.key === "Escape") {
            closeShortcutsModal();
            closeDetailDrawer();
            document.getElementById("healthCheckModal")?.classList.add("hidden");
            document.getElementById("allCollectionsModal")?.classList.add("hidden");
            document.getElementById("reviewModal")?.classList.add("hidden");
            document.getElementById("lightbox")?.classList.add("hidden");
            document.getElementById("searchDropdown")?.classList.remove("active");
            document.getElementById("notificationsFlyout")?.classList.add("hidden");
            return;
        }

        // Ctrl + K: Focus Search
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            const searchInput = document.getElementById("globalSearchInput");
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
            return;
        }

        // Ctrl + B: Toggle Left Sidebar
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "b") {
            e.preventDefault();
            const collapseBtn = document.getElementById("collapseSidebarBtn");
            if (collapseBtn) collapseBtn.click();
            return;
        }

        // Ctrl + Shift + B or Alt + P: Toggle Right Control Studio
        if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "b") || (e.altKey && e.key.toLowerCase() === "p")) {
            e.preventDefault();
            const togglePanelBtn = document.getElementById("btnToggleControlPanel");
            if (togglePanelBtn) togglePanelBtn.click();
            return;
        }

        // If inside an input/textarea, do not capture single-key shortcuts
        if (isInputFocused) {
            return;
        }

        // ? or F1: Open Shortcuts Modal
        if (e.key === "?" || e.key === "F1") {
            e.preventDefault();
            openShortcutsModal();
            return;
        }

        // Alt + S or Space: Toggle Slideshow
        if ((e.altKey && e.key.toLowerCase() === "s") || e.code === "Space") {
            e.preventDefault();
            const isRunning = !!store.state.settings.slideshow;
            const nextState = !isRunning;
            try {
                if (nextState) {
                    const rightInterval = document.getElementById("rightIntervalSelect");
                    const selectedMs = Number(rightInterval?.value) || store.state.settings.slideshowInterval || 1800000;
                    if (selectedMs !== store.state.settings.slideshowInterval) {
                        await window.api.updateInterval(selectedMs);
                        store.state.settings.slideshowInterval = selectedMs;
                    }
                }
                await window.api.toggleSlideshow(nextState);
                store.state.settings.slideshow = nextState;
                setSlideshowPlaybackUI(nextState);
                updatePlayerStatusText();
                updateQuickActionSlideshowUI(nextState);
                const rightToggle = document.getElementById("rightSlideshowToggle");
                if (rightToggle) rightToggle.checked = nextState;
                showToast(nextState ? "Slideshow started" : "Slideshow paused", "info");
            } catch (err) {
                showToast("Failed to toggle slideshow", "error");
            }
            return;
        }

        // Alt + N or ArrowRight: Next Wallpaper
        if ((e.altKey && e.key.toLowerCase() === "n") || e.key === "ArrowRight") {
            e.preventDefault();
            const nextBtn = document.getElementById("rightSlideshowNextBtn");
            if (nextBtn) {
                nextBtn.click();
            }
            return;
        }

        // Alt + R: Apply Random Wallpaper
        if (e.altKey && e.key.toLowerCase() === "r") {
            e.preventDefault();
            const randomBtn = document.getElementById("quickActionRandom");
            if (randomBtn) {
                randomBtn.click();
            }
            return;
        }

        // Alt + F: Toggle Favorite on current wallpaper
        if (e.altKey && e.key.toLowerCase() === "f") {
            e.preventDefault();
            const heartBtn = document.querySelector(".drawer-heart-btn");
            if (heartBtn) {
                heartBtn.click();
            } else {
                showToast("Select a wallpaper to favorite", "info");
            }
            return;
        }
    });
}
