# Wallpaper Sync v5.2.0 Release Notes & Patch Documentation 🌄🚀

**Release Date:** November 15, 2026  
**Target Platform:** Windows 10 & 11 (x64)  
**Author & Maintainer:** Debanjan Dutta  

---

## 🌟 Executive Summary

Wallpaper Sync **v5.2.0** brings significant visual enhancements, background process optimizations, and resilient offline capabilities:

1. **Orientation Safe Switch (16:9 Widescreen Normalization):** A one-click automated normalization engine that identifies mobile/vertical scrapes, rotated EXIF tags, or sideways orientation glitches, losslessly normalizing wallpapers to 16:9 widescreen landscape with synchronized thumbnail regeneration.
2. **Hibernation-Aware Dynamic Ambient Hue System:** An ambient lighting engine that dynamically extracts the dominant color from your active desktop wallpaper and softly tints application cards, borders, and glows in both Dark and Light modes. When the application is minimized or hidden in the background, it safely enters hibernation, pausing CPU-intensive timers and color extractions to maintain **0% idle background CPU**.
3. **Resilient Offline-First Metadata Engine:** Robust local caching with 3.5s connection timeouts and graceful offline fallback, completely eliminating `ECONNRESET` crash logs and fixing collection count glitches on initial boot.
4. **Gallery Aspect Ratio Lock:** Strict 16:9 card geometry enforcement with `object-fit: cover` and individual on-card 90° clockwise lossless rotation controls.

---

## 🛠️ Detailed Patch Notes & Changes

### 1. 🛡️ Orientation Safe Switch & Universal 16:9 Engine
- **Top Header Safe Switch Button (`#btnSafeOrientationSwitch`):** Added a dedicated switch in the top header with a permanent `16:9` status badge for immediate 1-click normalization.
- **Settings Modal Integration (`#settingBatchFixRotationsBtn`):** Updated settings controls with clear labeling: `🛡️ Orientation Safe Switch (Auto-Normalize 16:9 Widescreen)`.
- **Fast Binary Header Orientation Detection (`main.js`):**
  - Scans image headers (`getJpegDimensionsFast`) to identify orientation directly from binary SOF0/IHDR chunks without full image decoding.
  - Automatically identifies any wallpaper where `height > width`, wallpapers with non-standard EXIF orientation headers (orientation 6 or 8), or wallpapers whose cached thumbnails were generated in vertical aspect ratios.
- **Lossless In-Place Bitmap Rotation:**
  - Fast 270° CCW / 90° CW in-memory rotation using native buffers and atomic temporary file swapping (`.tmp -> .jpg`).
  - Automatic thumbnail regeneration ($380 \times 214$) stored in `thumbnails/thumb_${hash}.jpg`.
  - Immediate desktop re-application if the normalized wallpaper is currently set as the active desktop background.

### 2. 🎨 Hibernation-Aware Dynamic Ambient Hue Adaptation
- **Dual-Theme Dynamic Tinting:**
  - **Dark Mode:** Blends dominant wallpaper colors into velvet charcoal surfaces (`rgba(r, g, b, 0.12)` to `0.22`), primary accents, and subtle glow shadows.
  - **Light Mode:** Gently tints warm cream surfaces (`#FFEAD3`), borders, and button highlights while preserving contrast and readability.
- **Window Hibernation Mode:**
  - Implemented `app:window-hidden` and `app:window-shown` IPC event listeners.
  - When the app is minimized to the system tray, active color extraction, CSS re-calculations, and timer routines enter deep hibernation, dropping background CPU usage to **0%**.
  - When the app window is restored, dominant colors and slideshow states seamlessly resume without delay.

### 3. 💾 Offline-First Resilient Metadata Caching
- **Network Resilience & Timeout Protection (`metadataCache.js`):**
  - Configured strict 3500ms timeouts on remote collection endpoints (`/api/collections`, `/api/tags`, `/api/categories`).
  - Implemented graceful fallback: on connection resets (`ECONNRESET`) or network drops, Wallpaper Sync instantly uses `local_metadata.json` without throwing unhandled exceptions.
- **Immediate True Collection Counts:**
  - Fixed timing synchronization in `ui/store.js` where collections previously rendered with `0 wallpapers` or `⚡ 0` on first load. Collections now immediately query local metadata on boot.

### 4. 🧹 Code Health & Deprecation Clean-up
- **Eliminated Node.js `[DEP0187]` Warning:**
  - Introduced `safeExists(p)` guards around all file access points, validating non-empty string types before calling `fs.existsSync`.
- **Gallery Cache-Busting:**
  - Appended `?v=${mtimeMs}` query parameters to all catalog image tags, forcing Chromium to immediately display updated orientations without requiring application re-installation or cache clearing.

---

## 📊 Verification & Test Matrix

| Component | Test Carried Out | Result |
| :--- | :--- | :--- |
| **Wallpaper Database** | Scanned 733 wallpapers & 733 thumbnails | 100% 16:9 Landscape Upright |
| **Web Application** | `npm --prefix web run build` | **Passed (0 errors)** |
| **Launching Page** | `npm --prefix launching_page run build` | **Passed (0 errors)** |
| **Desktop Client Syntax** | `node -c main.js; node -c ui/app.js` | **Clean Syntax (0 warnings)** |
| **Electron Runtime** | Startup test via `node scripts/start-dev.js` | Zero deprecation warnings |

---

## 🚀 How to Use the Orientation Safe Switch

1. Launch Wallpaper Sync.
2. In the top navigation bar, click the **Orientation Safe Switch** button (marked with `16:9`), or open **Settings (`Ctrl + ,`)** and click **Orientation Safe Switch**.
3. The engine instantly scans your local wallpapers, normalizes any tilted images to widescreen landscape, regenerates crisp thumbnails, and updates your gallery in real time.

