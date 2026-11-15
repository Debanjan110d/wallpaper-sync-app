# Wallpaper Sync v5.2.1 Release Notes & Patch Documentation 🌄🚀

**Release Date:** November 15, 2026  
**Target Platform:** Windows 10 & 11 (x64)  
**Author & Maintainer:** Debanjan Dutta  

---

## 🌟 Executive Summary

Wallpaper Sync **v5.2.1** is a stability and refinement release resolving sync anomalies, gallery chronological ordering, and system diagnostics:

1. **Resilient Sync Engine & 404 Auto-Ignored:** Added automatic handling for missing CDN assets (e.g. `4ec848fa5365e106...jpg`), completely preventing 404 download errors from surfacing as application error toasts and ensuring sync cursor progress.
2. **Accurate Chronological Ordering & Gallery Sync:** Restored true server upload timestamps across all wallpapers on disk and in `local_metadata.json`, resolving flipped ordering and ensuring "Recently Added" displays the actual newest wallpapers.
3. **Diagnostics Self-Repair Fix:** Fixed `ReferenceError: setDesktopWallpaper is not defined` during 1-click health repairs.
4. **Orientation Safe Switch (16:9 Widescreen Normalization):** One-click automated normalization engine that identifies mobile/vertical scrapes, rotated EXIF tags, or sideways orientation glitches, losslessly normalizing wallpapers to 16:9 widescreen landscape while atomically preserving file timestamps.
5. **Hibernation-Aware Dynamic Ambient Hue System:** Ambient lighting that extracts dominant colors in Dark and Light themes with 0% idle CPU when minimized.

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

