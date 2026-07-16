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
            <img src="${toFileUrl(img.path)}" class="hero-slide-img" alt="${img.filename}" draggable="false" />
            <div class="hero-slide-overlay"></div>
            <div class="hero-slide-content">
                <span class="hero-slide-tag">${catName}</span>
                <h3 class="hero-slide-title">${colName}</h3>
                <p class="hero-slide-desc">Recently added to your desktop wallpaper collection</p>
                <button class="primary-btn slider-browse-btn" data-path="${img.path}">Apply Wallpaper</button>
            </div>
        `;

        slide.querySelector(".slider-browse-btn").addEventListener("click", async (e) => {
            e.stopPropagation();
            const btn = e.target;
            btn.textContent = "Applying...";
            await window.api.setWallpaper(img.path);
            btn.textContent = "Applied!";
            setTimeout(() => { btn.textContent = "Apply Wallpaper"; }, 2000);
            
            // Trigger review eligibility check after application
            store.state.settings = await window.api.getSettings();
            import("./modal.js").then(m => m.checkReviewEligibility());
        });

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

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

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
