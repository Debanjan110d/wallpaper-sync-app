# Changelog

## 5.0.0 (v5.0.0) — 2026-11-12

### Major Architecture & Performance Overhaul
- **System Health & Diagnostic Engine:** Completely overhauled the diagnostics pipeline (`app:health-check`) with zero runtime errors. Checks dual wallpaper directories (`SOURCE_DIR` & `WALLPAPER_DIR`), verifies file integrity, detects 0-byte corrupt files, validates active wallpaper desktop bindings, monitors watchdog telemetry, pings cloud API endpoint with real-time latency, and measures process memory footprint.
- **1-Click Auto-Repair & Optimization:** Added `app:health-fix` and a 1-click **Optimize & Repair All** action directly inside the Diagnostics modal to auto-clean corrupt files, restore missing active wallpapers, and re-enable the recovery watchdog.
- **Universal Dark Scrollbars:** Added universal custom scrollbar styles across Windows Chromium, eliminating native white/grey Windows scrollbars on the top search trends bar, wallpaper details drawer, and dashboard grids.
- **Clean Search & Tag Bar:** Polished the search clear button (`✕`) positioning, centering, and hover state, and hidden overflow scrollbars on the top searches strip.
- **Right Studio Panel Toggle & Default Collapse:** Made the right "Desktop Studio" panel collapsible by default to give full screen focus to the wallpaper gallery, with smooth expand/collapse toggling and active header indicator.
- **Interactive Top Notification Center:** Turned the notification bell on the top-right header into a full-fledged live telemetry flyout featuring dynamic system status, cloud sync indicators, recovery watchdog reports, and a 1-click in-app review trigger.
- **Permanent In-App Review & Rating:** Added a permanent "Rate & Review" access point in the sidebar Preferences menu, in the Notification Center, and added a direct close button to the review modal so users can provide feedback anytime.
- **Virtual Batch Catalog Rendering (Memory Optimization):** Slashed desktop RAM consumption from ~500MB+ down to ~80–120MB by replacing simultaneous 700+ DOM image rendering with an intelligent virtual batch loader (32 cards initially, with `IntersectionObserver` auto-loading the next batch as you scroll).
- **Asynchronous Image Decoding:** All gallery cards now use `loading="lazy"` and `decoding="async"`, completely eliminating scroll stutter.
- **Left Sidebar Navigation System:**
  - `Home`: Returns to the primary discovery dashboard and smoothly scrolls to top.
  - `Discover`: Scrolls directly to the wallpaper grid and focuses search (`Ctrl + K`).
  - `Collections`: Directly launches the **Explore All Collections** modal page with live search and cover previews.
  - `Library`: Filters to the full local wallpaper collection with real-time file counters.
  - `Favorites`: Fixed path matching bug (`isWallpaperFavorite`) so favorites display instantly without ever showing "No wallpapers match filters".
- **Right Slide-Out Drawer Overhaul:**
  - Resolved horizontal overflow and eliminated the white scrollbar on Windows.
  - Added actual file size calculation (`main.js` returns `sizeBytes: fs.statSync(full).size`), completely replacing `"N/A"`.
  - Added responsive ellipsis truncation and full-width layout for long file names.
- **Notification Toast Redesign:**
  - Relocated toast notifications to the bottom-right corner with a sleek glassmorphic pill layout.
  - Removed intrusive toast popups on routine tab navigation and silent background syncs.

---

## 4.3.0 (v4.3.0) — 2026-11-12

### Desktop App Redesign & Recovery Watchdog
- **Desktop Studio Evolution:** Evolved the Windows desktop application into a 3-column layout (Left Navigation, Center Wallpaper Discovery Viewport, Right Control Panel) styled with a deep dark palette (`#080D1B`), surface elevations (`#111A30`), and purple/indigo accents (`#7838F5`, `#A855F7`).
- **Real Background Recovery Watchdog:** Implemented an autonomous background service (`recoveryWatchdog.js`) that monitors Windows session and power events (`resume`, `unlock-screen`, registry checks) to auto-restore the intended desktop wallpaper if Windows overrides or resets it.
- **Dedicated Right-Side Control Panel:** Quick slideshow controls, real-time "Now Playing" desktop wallpaper card, system status telemetry, and live watchdog status toggle.
- **Quick Actions Row:** Instant access buttons for `⚡ Apply Random`, `🖥️ Start Slideshow`, `🔄 Sync Library`, and `🔧 Health Check`.
- **Card Enhancements:** 16:9 widescreen previews with 1-click heart favorite toggles, hover quick-apply, and cleaner metadata pills.

### Collection Search Filtering (Admin Dashboard)
- **Live Collection Search:** Added real-time search input filters to all collection selection interfaces in [web/app/page.tsx](file:///d:/projects/wallpaper-sync-app/web/app/page.tsx):
  - **Upload Form:** Quickly filter through collection chips while retaining selected collections.
  - **Bulk Edit Floating Bar:** Search and filter multi-assign collection checkboxes.
  - **Individual Edit Modal:** Search collections inside the metadata editor modal.

### Usage-Based Review Prompts & Client Website Fix
- **3-Day Usage Threshold:** Users are prompted for a review only after using the app for at least 3 days (`firstUsedAt`).
- **10-Day Snooze Interval:** Dismissed prompts ("Maybe Later") snooze for 10 days before checking again.
- **Permanent Completion Flag:** Once a review is submitted, `alreadyReviewed` is stored in `settings.json`, disabling future prompts.
- **Client Website Live Sync:** Cleaned out mock/test reviews from Supabase Storage and pointed the client website (`launching_page/app/reviews/page.tsx`) to the live production API endpoint.

---

## 4.2.0 (v4.2.0) — 2026-11-12

### Admin Panel Overhaul — Multi-Collection Architecture

#### Upload Form
- **Multi-Collection Chip Picker:** Replaced the single collection `<select>` dropdown in the Upload form with a scrollable chip-toggle panel. Admins can now select **multiple collections** at once during upload. The selected count is shown below the picker. A `+ New` button still allows inline collection creation.
- **Multi-Collection Upload API:** Updated `POST /api/upload` to accept a `collection_ids` JSON array in addition to the legacy `collection_id` field. All selected collections are batch-inserted into `wallpaper_collections` on upload.

#### Bulk Edit — Add vs Replace Mode
- **Add / Replace Toggle:** The floating Bulk Edit action bar now features a segmented **➕ Add / 🔄 Replace** mode toggle. In **Add** mode (default), selected collections and tags are merged with existing assignments using upsert (no data loss). In **Replace** mode, existing assignments are cleared first and replaced entirely.
- **Backend Mode Support:** `POST /api/wallpapers/bulk-update` now accepts a `mode: "add" | "replace"` field. Add mode uses `upsert` with `ignoreDuplicates` to safely append; Replace mode deletes existing links then re-inserts.

#### Code Cleanup
- Removed dead `selectedCategoryForUpload`, `bulkCategoryId`, `bulkCollectionId` state variables and their associated `handleCreateCategory` function from the admin dashboard.
- Removed unused `filteredUploadCollections` alias (direct `collections` state now used).

---

## 4.1.1 (v4.1.1) — 2026-10-17

### Bug Fix

- **Fixed "View All Collections" Modal Not Opening:** Resolved a critical HTML nesting bug where the `#allCollectionsModal` was accidentally placed *inside* `#metadataSyncModal` due to a missing closing `</div>` tag for the Metadata Sync modal. This caused the "View All Collections" button to do nothing when clicked on its own, and caused the full collections grid to wrongly appear alongside the Sync Metadata popup instead of opening independently. Added the missing `</div>` closing tag for `#metadataSyncModal` so both modals are properly siblings in the DOM and work as intended.

---

## 4.1.0 (v4.1.0) — 2026-09-02

### Browse Collections & Discovery UI/UX Overhaul
- **Horizontal Mouse Wheel & Drag Scrolling:** Enabled smooth horizontal scrolling on `#categoriesGrid` with mouse wheel controls, mouse drag-to-scroll, and left/right navigation arrows (`#categoriesPrevBtn`, `#categoriesNextBtn`).
- **3D Card Aesthetics:** Upgraded collection cards with 3D hover elevation (`translateY(-6px) scale(1.03)`), smooth cover image zoom (`1.1x`), glowing glassmorphic count badges (`⚡ 8`), and active selection highlight rings (`.active-selected`).
- **"View All Collections" Frosted Blur Explorer Modal:** Added a section header flex bar with a total collection count badge (`#collectionsCountBadge`) and a **"View All Collections →"** action button opening a full-screen frosted glass backdrop blur modal (`#allCollectionsModal`). Includes live search (`#modalCollectionSearch`) across all collections with thumbnail cover art and wallpaper counts.

### Search Auto-Complete & Weighted Ranking Engine
- **YouTube-Style Auto-Complete Suggestions:** Added a real-time auto-complete dropdown (`#searchSuggestionsDropdown`) below `#globalSearchInput` showing matching Collections, Tags, and Wallpaper Titles with query term highlighting (`.suggestion-highlight`) and full keyboard navigation (Up/Down arrows + Enter).
- **Weighted Search Relevance Engine:** Implemented relevance scoring for search terms (+100 tag match, +90 collection match, +80 title match, +15 description match), dynamically sorting gallery results by relevance score descending.
- **Top Searches & Randomizer:** Relocated popular search tags to a **"🔥 Top Searches"** header bar equipped with a **🎲 Shuffle** button to randomize tag suggestions dynamically.

### 4-Table Database Architecture Migration & Optimization
- **Database Simplification:** Migrated database down to **4 core tables** (`wallpapers`, `collections`, `tags`, `wallpaper_collections`, `wallpaper_tags`), eliminating legacy `ai_jobs`, `collection_keywords`, `categories`, and obsolete columns (`status`, `confidence`, `indexed_at`, `characters`, `franchises`, `styles`, `moods`, `other_attributes`, `ai_confidence`, `nsfw`).
- **Prisma ORM Integration:** Added `web/prisma/schema.prisma` mapping the 4 core models with `@prisma/client`.
- **Image & Data Safety Guarantee:** 100% of wallpaper records, metadata, titles, descriptions, collection assignments, tags, and images in the Supabase storage bucket (`wallpapers/`) were safely preserved.
- **Resilient Image Downloader:** Wrapped image downloads in defensive `try/catch` checks to handle missing CDN files (404) gracefully without interrupting wallpaper downloads or crashing the desktop sync process.

## 4.0.0 (v4.0.0) — 2026-08-02

### Pre-configured Default Fallback Sync Token
- **Authentication Fix for New Systems:** Set `sync_secret_token_123` as the default fallback token in `config.js` to ensure fresh, packaged client installations authenticate with the Vercel API seamlessly. Prevents the app from throwing a `401 Unauthorized` block on other users' PCs now that the settings forms are removed from the client UI.

### Restore Panels & Drag-and-Drop
- **Settings Visibility:** Restored the `#maintenanceSection` and `#dragHintSection` visibility for production/packaged environments (which was temporarily disabled in 3.7.0).
- **Drag-and-Drop Local Upload:** Restored drag-and-drop listeners to handle files dropped onto the Electron window, copying them to the local workspace image folders via IPC and reloading the gallery grid.

### Removed Server Settings Form
- **HTML & JS Clean Up:** Extracted the "Server Settings" input fields and "Save Settings" button from the collapsible sidebar panel to keep the interface focused. Settings variables and backend sync connection read configurations still run in the background.

### Resolved Collection Creation API Bug (Admin Web Server)
- **Database Insertion Fix:** Modified the Next.js `POST` API handler in [collections route.ts](file:///d:/projects/wallpaper-sync-app/web/app/api/collections/route.ts) to extract `category_id` from the payload and insert it into Supabase, avoiding orphaned collections that failed to appear under their categories.

## 3.7.0 (v3.7.0) — 2026-08-02

### Release Verification & Build Testing
- **Minor Version Bump:** Incremented application version to 3.7.0 for release pipeline and installation package validation testing.

## 3.6.0 (v3.6.0) — 2026-08-01

### Network Egress & Caching Fixes
- **Resilient ETag Validation Caching:** Implemented conditional HTTP cache validation utilizing dynamic ETags built from database counts, latest creation times, and row metadata fingerprint hashes (representing ids, titles, collections, and tags). Bypasses 100% of body download payloads on both the web client and the desktop Electron client by returning `304 Not Modified` when database contents are unchanged, saving database CPU and outbound network bandwidth budget.
- **Bypassed Stale Browser Caching:** Set `/api/wallpapers` route to `force-dynamic` and changed the `Cache-Control` header to `no-cache`. This forces client browsers to perform ETag validation on every request, ensuring newly uploaded wallpapers appear immediately without requiring a browser cache clear.
- **Sync Client Cache Synchronization:** Updated the desktop synchronization service (`metadataCache.js`) to persist ETags locally and attach them to sync check cycles, eliminating redundant offline calculations and disk writes.

### Resiliency, Syncing & Limits
- **Resilient Wallpaper Syncing:** Wrapped individual wallpaper downloads in `try/catch` blocks so that a single file failure does not crash or halt the entire sync process.
- **Windows File Locking Bug:** Wait on the write-stream `close` event instead of `finish` before renaming files, ensuring the file descriptor is released by Windows and preventing `EPERM` or `EBUSY` rename errors.
- **Dynamic Sync Completion:** Fixed a UI loader bug by always updating `lastSyncDate` and sending the `sync-complete` event to the Electron UI upon successful sync execution, even when no new images were found to download.
- **Sync API Pagination Limit:** Bypassed the server's default 30-item pagination limit for client sync token requests (increasing it to `100,000`), allowing the sync client to retrieve all new wallpapers in a single request.
- **Database Schema Resiliency:** Added dynamic fallback query retry blocks in backend API routes. If the database schema is missing updated columns (like `primary_color`) or tables (like `reviews`), the endpoints gracefully warning-log and retry/fallback to return successfully rather than failing with `500 Internal Server Error`, ensuring the site operates seamlessly before/during migrations.
- **Next.js Image Layout Stability:** Decoupled container layout styles from raw image attributes inside the React `OptimizedImage` component, resolving runtime clashing errors with Next.js's absolute `fill` property.

### CDN, Performance & UI Enhancements
- **ImageKit Private S3 Path Resolution:** Enabled path-style URL formatting for ImageKit external storage origins, allowing it to correctly read private files in the root of the Supabase S3 S3-Compatible bucket.
- **LCP Loading Optimizations:** Eagerly loaded above-the-fold wallpaper grid items using Next.js image priority flags, eliminating Largest Contentful Paint browser alerts.
- **Live Wallpaper Counts:** Added visual count indicators in the admin brand header showing total wallpapers, and updated the grid counter to show `Showing Y of X wallpapers` (e.g. 30 of 345) to clarify the pagination state.
- **Category-to-Collection UI Migration:** Restructured the horizontal explorer grid inside the Electron client app to browse "Collections" rather than "Categories". Displays computed wallpaper counts per collection and assigns the first item's thumbnail as the card's visual background cover.
- **Packaged UI Protections:** Exposed packaging status via `api.isPackaged` context bridge and added startup logic to automatically hide the "Maintenance & Sync" settings and "Drag & drop images" uploader in production/packaged builds. Keeps them visible only during development (`npm start`).

## 3.5.0 (v3.5.0) — 2026-07-17

### Desktop Client Enhancements
- **UI Modularization (ES Modules):** Cleaned up and restructured the `ui` directory, refactoring the 1700+ line `app.js` file into independent modules (`utils.js`, `slider.js`, `gallery.js`, `drawer.js`, `player.js`, `modal.js`) coordinated by a centralized state store (`store.js`).
- **Smart App Control & Antivirus Bypass:** Enabled ASAR packaging and configured `electron-builder` to sign builds using `cscLink` and `cscKeyPassword`. Created a local PowerShell signing utility (`scripts/create-self-signed-cert.ps1`) to sign builds and bypass Windows Smart App Control (SAC) and Defender blocks on development/test environments.

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
