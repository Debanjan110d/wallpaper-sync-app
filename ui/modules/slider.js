// Hero Slideshow Slider component
import { store } from "../store.js";
import { toFileUrl } from "./utils.js";

export function renderHeroSlider() {
    const container = document.getElementById("heroSliderSection");
    if (!container) return;
    container.innerHTML = "";

    const currentImages = store.state.currentImages || [];
    if (currentImages.length === 0) {
        container.style.display = "none";
        return;
    }
    container.style.display = "block";

    const sliderList = currentImages.slice(-5).reverse();
    store.state.sliderActiveIndex = 0;

    sliderList.forEach((img, idx) => {
        const slide = document.createElement("div");
        slide.className = `hero-slide ${idx === 0 ? "active" : ""}`;

        const hash = img.filename.split(".")[0];
        const meta = store.state.localMetadata.wallpaper_metadata[hash] || {};
        const colName = store.state.localMetadata.collections.find(c => c.id === meta.collection_id)?.name || "Default Library";
        const catId = store.state.localMetadata.collections.find(c => c.id === meta.collection_id)?.category_id;
        const catName = store.state.localMetadata.categories.find(c => c.id === catId)?.name || "Featured";

        slide.innerHTML = `
            <img src="${toFileUrl(img.thumbPath || img.path)}" class="hero-slide-img" alt="${img.filename}" draggable="false" loading="eager" decoding="async" />
            <div class="hero-slide-overlay"></div>
            <div class="hero-slide-content">
                <div class="hero-featured-tag">✨ Featured Collection</div>
                <h3 class="hero-slide-title">${colName}</h3>
                <p class="hero-slide-desc">Breathtaking high-definition wallpapers for your desktop.</p>
                <div class="hero-actions-row">
                    <button class="hero-btn-primary slider-explore-btn">
                        <span>Explore Collection</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                    <button class="hero-btn-secondary slider-apply-btn" data-path="${img.path}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        <span>Quick Apply</span>
                    </button>
                </div>
            </div>
        `;

        const applyBtn = slide.querySelector(".slider-apply-btn");
        if (applyBtn) {
            applyBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                applyBtn.querySelector("span").textContent = "Applying...";
                await window.api.setWallpaper(img.path);
                store.state.settings.activeWallpaper = img.path;
                applyBtn.querySelector("span").textContent = "Applied!";
                
                // Dispatch wallpaper change event
                window.dispatchEvent(new CustomEvent("wallpaper:changed", { detail: img }));

                setTimeout(() => {
                    if (applyBtn.querySelector("span")) applyBtn.querySelector("span").textContent = "Quick Apply";
                }, 2000);

                // Trigger review eligibility check after application
                store.state.settings = await window.api.getSettings();
                import("./modal.js").then(m => m.checkReviewEligibility());
            });
        }

        const exploreBtn = slide.querySelector(".slider-explore-btn");
        if (exploreBtn) {
            exploreBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const colFilter = document.getElementById("colFilter");
                if (colFilter && meta.collection_id) {
                    colFilter.value = meta.collection_id;
                    colFilter.dispatchEvent(new Event("change"));
                }
                document.getElementById("catalogFilterSection")?.scrollIntoView({ behavior: "smooth" });
            });
        }

        container.appendChild(slide);
    });

    if (sliderList.length > 1) {
        const dotsContainer = document.createElement("div");
        dotsContainer.className = "slider-dots";

        sliderList.forEach((_, idx) => {
            const dot = document.createElement("button");
            dot.className = `slider-dot ${idx === 0 ? "active" : ""}`;
            dot.addEventListener("click", () => setActiveSlide(idx));
            dotsContainer.appendChild(dot);
        });

        // Create previous & next navigation buttons for hero slider
        const prevBtn = document.createElement("button");
        prevBtn.className = "slider-nav-btn prev";
        prevBtn.innerHTML = "&lt;";
        prevBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const prevIdx = (store.state.sliderActiveIndex - 1 + sliderList.length) % sliderList.length;
            setActiveSlide(prevIdx);
        });

        const nextBtn = document.createElement("button");
        nextBtn.className = "slider-nav-btn next";
        nextBtn.innerHTML = "&gt;";
        nextBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const nextIdx = (store.state.sliderActiveIndex + 1) % sliderList.length;
            setActiveSlide(nextIdx);
        });

        container.appendChild(prevBtn);
        container.appendChild(nextBtn);
        container.appendChild(dotsContainer);
        startHeroSlideshow(sliderList.length);
    }
}

export function setActiveSlide(index) {
    const slides = document.querySelectorAll(".hero-slide");
    const dots = document.querySelectorAll(".slider-dot");
    if (slides.length === 0) return;

    slides.forEach(s => s.classList.remove("active"));
    dots.forEach(d => d.classList.remove("active"));

    store.state.sliderActiveIndex = index;
    slides[store.state.sliderActiveIndex].classList.add("active");
    if (dots[store.state.sliderActiveIndex]) {
        dots[store.state.sliderActiveIndex].classList.add("active");
    }
}

export function startHeroSlideshow(slideCount) {
    if (store.state.sliderInterval) clearInterval(store.state.sliderInterval);

    const mediaQuery = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (mediaQuery && mediaQuery.matches) return;

    store.state.sliderInterval = setInterval(() => {
        if (!store.state.isSliderPaused) {
            const nextIdx = (store.state.sliderActiveIndex + 1) % slideCount;
            setActiveSlide(nextIdx);
        }
    }, 6000);

    const section = document.getElementById("heroSliderSection");
    if (section) {
        section.onmouseenter = () => { store.state.isSliderPaused = true; };
        section.onmouseleave = () => { store.state.isSliderPaused = false; };
    }
}
