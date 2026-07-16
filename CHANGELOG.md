# Changelog

## 3.4.1 (v3.4.1) — 2026-07-16

### Desktop Client Enhancements
- **Horizontal Row Auto-Scrolling:** Added smooth, hover-pausable auto-scrolling to the "Recently Added" and "Random Discoveries" rows, making the home discovery dashboard feel more dynamic and alive. Auto-scroll pauses automatically on drag or mouse hover, and gently ping-pongs directions at borders.

### Web Admin & Upload Enhancements
- **Wallpaper Bulk Update & Management UI:** Implemented bulk updating APIs and a grid-based bulk tagging management dashboard in the Next.js server web application.
- **Upload Progress Bar:** Added real-time visual progress feedback bar for wallpaper image uploads.
- **Improved AI Metadata Engine:** Migrated back-end auto-categorization to target a robust many-to-many relationship using wallpaper junction tables (`wallpaper_collections` and `collection_keywords`) driven by Gemini visual analysis of styles, primary colors, quality ratings, and keyword weights.

### System & Database Documentation
- **Database Schema Guide:** Introduced full architectural documentation of the normalized Supabase database structure and connected it directly to the primary repository documentation.

## 3.4.0 (v3.4.0) — 2026-07-15

### Architectural Simplification
- Converted metadata synchronization into a clean, one-directional client pull from the server (Server -> Client).
- Removed the local offline queueing and database write/upload features from the desktop client to make metadata management strictly server-centric.

### Desktop Client UI & Experience
- Replaced select dropdowns and checklist checkboxes in the details drawer with premium, read-only labels and static tag badges.
- Removed '#' prefix formatting from tags across all filters and badges (displaying tag names like "nature" directly).
- Removed the inline creator modal and creator buttons from the client.

### Bug Fixes
- Fixed a search filtering bug by adding file_name to the local cache and modifying fuzzy search matching to check original human-readable file names (meta.file_name) rather than only hashed local filenames.

## 3.3.0 (v3.3.0) — 2026-07-14

### Desktop Client UI & Experience revamps
- Repositioned search results directly underneath the search bar by hiding home dashboard rows dynamically during active searches.
- Embedded corner quality badges (`4K`, `HD`) and visual style tags directly overlaying gallery cards.
- Clamped tags list in horizontal cards to a maximum of 3 chips plus an elegant `+x` overflow badge.
- Added desktop-level notification/toasts for manual and background library synchronizations, rotation events, and connection alerts.
- Integrated `content-visibility: auto` to optimize scrolling performance and minimize browser layout repaint memory costs.

### Official Landing Page & Technical Docs
- Redesigned the landing page to feature a unified, simplified release container instead of separating stable and beta.
- Featured the new Gemini 2.5 Flash indexing engine capabilities directly in the hero layout.
- Added comprehensive technical documentation covering base64 indexing architectures, db constraints, tray sync parameters, and offline fuzzy search logic.

## 3.3 (v3.3) — 2026-07-14

### Desktop Client UI & Experience revamps
- Repositioned search results directly underneath the search bar by hiding home dashboard rows dynamically during active searches.
- Embedded corner quality badges (`4K`, `HD`) and visual style tags directly overlaying gallery cards.
- Clamped tags list in horizontal cards to a maximum of 3 chips plus an elegant `+x` overflow badge.
- Added desktop-level notification/toasts for manual and background library synchronizations, rotation events, and connection alerts.
- Integrated `content-visibility: auto` to optimize scrolling performance and minimize browser layout repaint memory costs.

### Official Landing Page & Technical Docs
- Redesigned the landing page to feature a unified, simplified release container instead of separating stable and beta.
- Featured the new Gemini 2.5 Flash indexing engine capabilities directly in the hero layout.
- Added comprehensive technical documentation covering base64 indexing architectures, db constraints, tray sync parameters, and offline fuzzy search logic.

## 3.2.3 (v3.2.3) — 2026-07-14

### Robustness & Download Optimizations
- Implemented atomic downloads using temporary files (`.tmp`) to prevent corrupted/partial wallpaper files.
- Added automatic detection and deletion of 0-byte or corrupted local files.

### Metadata Sync Progression & Fullscreen Support
- Added a detailed metadata sync progress modal in the UI with status descriptions and progress bar.
- Connected IPC events to update status spinner, success checkmark, or error indicators dynamically.
- Implemented automatic metadata sync triggers when the desktop client goes into full screen.

### Client UI Enhancements
- Redesigned the details drawer actions (Apply, Favorites, Delete) with premium SVG icons, animations, and hover micro-interactions.
- Fixed a bug where categories, collections, and tags were not dynamically refreshed upon sync completion.

## 3.2.2 (v3.2.2) — 2026-07-13

### Client UX & Search Improvements
- Fixed select option dropdown background and text contrast on Windows.
- Added fuzzy search with typo tolerance in the client search bar.
- Replaced hashed filenames with tags/metadata in card titles.
- Enabled category cover images as card backgrounds.
- Enabled standalone collection filtering without requiring a category selection.
- Handled defaulting missing collections to "Default" instead of matching category names.

### Performance & Database Reset
- Optimized Electron startup by making user data migration asynchronous to prevent launch freezes.
- Cleaned up database categories, collections, tags, and mapping associations to allow starting fresh.

## 3.2.1 (v3.2.1) — 2026-07-13

### Dashboard Redesign & Corrections
- Added an individual wallpaper metadata edit modal in the dashboard gallery cards to correct category, collection, or tag assignments.
- Added a collapsible system hierarchy mindmap card on the admin dashboard explaining categories, collections, tags, and synchronization paths.
- Redesigned the product landing page download section into separate, side-by-side Stable and Beta channels.

### Synchronization & Duplicate Tag Prevention
- Prevented creating duplicate tags with different casing (case-insensitive duplicate check based on slug).
- Fixed desktop client drawer metadata assignment to automatically resolve or create a default collection under selected category if left empty.
- Fixed 404 client sync errors by correctly parsing base API URLs and cleaning route suffix formats.

## 3.2.0 (v3.2.0) — 2026-07-13

### Dashboard Redesign
- Redesigned the home screen of the desktop app to function as a discovery dashboard rather than a static gallery.
- Added a hero slider showcase of featured wallpapers that automatically rotates.
- Added scrollable rows for recently added wallpapers and random discoveries.
- Added grid cards to browse collection categories.

### Offline-First Architecture
- Added local metadata caching using a local database structure (local_metadata.json). The desktop application now works completely offline without requiring server access.
- Implemented background synchronization queues that store local modifications (creating categories, collections, tags, or editing metadata) and push them to the server when connected.
- Added connection status indicators in the user interface to show connection health (online, offline pending, or unreachable).

### Media Controls and Collapsible Layout
- Added a media-player slideshow card in the left menu featuring play, pause, and skip controls.
- Shows active slideshow playlist name in the status block.
- Consolidated advanced controls and sync tasks into collapsible settings drawers to reduce congestion in the sidebar.
- Added a toggle button in the main section to minimize the left menu, expanding the catalog viewing layout.
- Repositioned connection status and count metrics sticky-aligned to the bottom footer of the sidebar.

### Feedback System and Analytics
- Integrated a review system that prompts users for a rating and comments inside the client app after changing wallpapers five times.
- Created server-side reviews endpoint to insert ratings into a Supabase database.
- Added an analytics card at the bottom of the administrator web page displaying review metrics, aggregate averages, and recent feedback entries.

### Miscellaneous
- Enforced strict single-instance locks at startup in the main process to prevent duplicate windows.
- Patched Next.js API endpoints to support write authorization using sync token headers.
- Added project credits for Debanjan Dutta in the sidebar footer.

## 3.0.2 (v3.0.2) — 2026-05-24

### ⬆️ App Updates (Windows)

- “Download update” now opens the latest installer in the user’s browser (direct `.exe` download from GitHub Releases)
- Removed in-app update downloading/install flow (no more uncertainty about where the installer is stored)

### ⚡ Performance / Background Optimizations

- Closing the dashboard now closes the window (renderer is destroyed) instead of hiding it, reducing background CPU/RAM usage while staying tray-only
- Startup “new wallpapers available?” check is now gated behind `autoSync` (disabled by default)

### 🖼️ Gallery

- Lightbox now has clickable left/right arrow buttons (keyboard arrows still work)
- Even smoother gallery scrolling, and prevents scroll getting stuck in responsive mode

### 🧯 Bug Fixes

- Fixes false “new wallpapers available” notifications caused by an invalid `lastSyncCursor` format (cursor is normalized to strict ISO)

## 3.0.1 (v3.0.1) — 2026-05-24

### 🪟 Windows Startup

- Fixes startup registration getting stuck after a dev run (only registers on packaged installs; tracks registered exe path)

### 🖼️ Gallery & Slideshow UX

- Slideshow selection can only be toggled while in “Manage Slideshow” mode
- Double-click a wallpaper to open a viewer; navigate with Left/Right arrow keys, close with Esc
- Smoother scrolling in the gallery/sidebar

## 3.0.0 (v3.0.0) — 2026-05-23

### 🌑 Major UI Refresh (Dark)

- Dark, clean dashboard styling and a more responsive layout (not locked to a single rigid grid)
- Better preview/selection UX across the app

### 🎞️ Slideshow Management

- Added slideshow management mode with a selected-preview strip
- Selected wallpapers can be removed directly from the preview strip (fixes “first items not deletable” behavior)
- Added random slideshow toggle

### 📥 Wallpaper Sync (Database-First / Supabase)

- Wallpaper listing now comes from the database as the source of truth (DB-first), not storage listing
- Incremental sync with `since` cursor (reduced bandwidth and faster syncs)
- Local ignore list prevents re-downloading wallpapers that the user deleted locally
- Preserves server ordering locally
- Startup-only “new wallpapers available?” check (no polling; minimal resources)
- Added “Clear Local Wallpapers” action to wipe local downloads and reset local sync state

### ⬆️ App Updates

- Update check happens once on app startup (no background polling)
- Automatically downloads updates when found
- Prompts the user to install/restart or defer after download completes

### 🛠️ Windows Stability

- Fixed Chromium/Electron disk cache “Access is denied (0x5)” issues by moving cache to a safe temp directory (per-launch)

## 2.0.2 (v2.0.2)

### 🪟 Windows Startup

- Adds native Windows "Startup apps" integration (users can enable/disable from Windows)
- On startup launches, app starts tray-only (does not open the dashboard)

## 2.0.1 (v2.0.1)

### ✨ Improvements

- Removed Auto Sync toggle and background auto-sync behavior
- Added live sync progress indicator (progress bar + percent)
- Added accurate local wallpaper count (matches the in-app collection)

### 🧯 UX

- Replaced blocking sync prompts with non-blocking, batch-level toast summaries

## 2.0.0

### 🚀 Overview

Initial fully working release of Wallpaper Sync...

### ✨ Features

- Import wallpapers via drag & drop
- Auto rename files
- ...

### 🔄 Sync System

- Fetch wallpapers from server
- Auto sync
- ...

### 🎞️ Slideshow

- Enable/disable
- Interval control

### ⚠️ Known Issues

- No auth
- Basic duplicate detection
