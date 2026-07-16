// Helper utility functions for the Wallpaper Sync UI

// 1. File path to Local URL conversion
export function toFileUrl(absolutePath) {
    if (!absolutePath) return "";
    const normalized = String(absolutePath).replace(/\\/g, "/");
    const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
    return encodeURI(`file://${withLeadingSlash}`);
}

// 2. Levenshtein Distance for fuzzy matching
export function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// 3. Fuzzy search match helper
export function fuzzyMatch(text, query) {
    if (!text || !query) return false;
    text = text.toLowerCase().trim();
    query = query.toLowerCase().trim();
    if (text.includes(query)) return true;

    let qIdx = 0;
    for (let tIdx = 0; tIdx < text.length; tIdx++) {
        if (text[tIdx] === query[qIdx]) {
            qIdx++;
            if (qIdx === query.length) return true;
        }
    }

    const textWords = text.split(/[\s_\-\.\(\)\[\]]+/);
    const queryWords = query.split(/[\s_\-\.\(\)\[\]]+/);

    for (const qw of queryWords) {
        if (qw.length < 2) continue;
        for (const tw of textWords) {
            if (tw.length < 2) continue;
            if (tw.includes(qw) || qw.includes(tw)) return true;

            const maxDistance = qw.length > 4 ? 2 : 1;
            if (levenshteinDistance(tw, qw) <= maxDistance) {
                return true;
            }
        }
    }
    return false;
}

// 4. Toast notification alerts
export function showToast(message, type = "error") {
    const toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) return;
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
    }, 4000);
}

// 5. Scroll optimization wheel logic
export function enableSmoothWheelScroll(el) {
    if (!el) return;
    try {
        const media = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
        if (media && media.matches) return;
    } catch { }

    let targetTop = el.scrollTop;
    let startTop = el.scrollTop;
    let startTime = 0;
    let rafId = 0;
    const durationMs = 380;
    const scrollMultiplier = 1.1;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function clampScrollTop(v) {
        const max = Math.max(0, el.scrollHeight - el.clientHeight);
        return Math.max(0, Math.min(max, v));
    }

    function tick(now) {
        const elapsed = now - startTime;
        const t = Math.max(0, Math.min(1, elapsed / durationMs));
        const eased = easeOutCubic(t);
        el.scrollTop = startTop + (targetTop - startTop) * eased;

        if (t < 1) {
            rafId = requestAnimationFrame(tick);
        } else {
            rafId = 0;
            el.scrollTop = targetTop;
        }
    }

    el.addEventListener("wheel", (e) => {
        if (e.ctrlKey || Math.abs(e.deltaY) < 0.01 || e.deltaMode === 0) return;
        if (el.scrollHeight <= el.clientHeight + 1) return;

        let deltaY = e.deltaY;
        if (e.deltaMode === 1) deltaY *= 16;
        else if (e.deltaMode === 2) deltaY *= el.clientHeight;
        deltaY *= scrollMultiplier;

        const max = Math.max(0, el.scrollHeight - el.clientHeight);
        if ((el.scrollTop <= 0.5 && deltaY < 0) || (el.scrollTop >= max - 0.5 && deltaY > 0)) return;

        e.preventDefault();
        startTop = el.scrollTop;
        targetTop = clampScrollTop(targetTop + deltaY);
        startTime = performance.now();

        if (!rafId) rafId = requestAnimationFrame(tick);
    }, { passive: false });
}

// 6. Drag Scroll logic for horizontal lists
export function makeDragScrollable(container) {
    if (!container) return;
    let isDown = false;
    let startX;
    let scrollLeft;
    let dragDetected = false;

    container.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return; // Left click only
        isDown = true;
        dragDetected = false;
        container.classList.add("active-dragging");
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });

    container.addEventListener("mouseleave", () => {
        isDown = false;
        container.classList.remove("active-dragging");
    });

    container.addEventListener("mouseup", () => {
        isDown = false;
        container.classList.remove("active-dragging");
    });

    container.addEventListener("mousemove", (e) => {
        if (!isDown) return;
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 2;
        if (Math.abs(x - startX) > 5) {
            dragDetected = true;
            container.scrollLeft = scrollLeft - walk;
            e.preventDefault(); // Prevent text selection/drag ghosting
        }
    });

    // Intercept card clicks during active drag-scroll
    container.addEventListener("click", (e) => {
        if (dragDetected) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true); // Capture phase!
}

// 7. Dynamic visibility of scroll row nav buttons
export function updateNavButtonsVisibility(row, prevBtn, nextBtn) {
    if (!row || !prevBtn || !nextBtn) return;
    const isScrollable = row.scrollWidth > row.clientWidth;
    if (!isScrollable) {
        prevBtn.style.display = "none";
        nextBtn.style.display = "none";
    } else {
        prevBtn.style.display = "";
        nextBtn.style.display = "";
    }
}
