# Wallpaper Sync Version 3 Release Notes

This release is a major upgrade to the Wallpaper Sync system. It changes the core layout of both the Windows desktop client and the Next.js web application. It introduces offline-first database synchronization, smart slideshows, interactive metadata categories, and rating systems.

---

## 1. Visual Redesign and Discovery Dashboard

The home page of the Electron desktop application has been rebuilt to focus on wallpaper discovery and library organization.

- **Hero Slider Showcase:** Displays a rotating carousel of the newest wallpapers at the top of the feed. Autoplay is configured to respect motion preferences and pauses automatically on user hover or keyboard focus.
- **Recently Added Feed:** A horizontal scrolling lane showing your latest wallpaper downloads, complete with dimensions, upload dates, and collection assignments.
- **Random Discoveries:** A row of randomized selections from your local collection, helping you find forgotten images.
- **Category Browsing Cards:** Visual cards showing each category, listing collections and file counts.
- **Minimize Sidebar Toggle:** A navigation hamburger button is placed next to the search bar. Clicking it collapses the left menu out of view, sliding the main feed layout to occupy the full screen.
- **Credit Footer:** Footnotes have been integrated into the sidebar bottom to acknowledge the project creator, Debanjan Dutta.

---

## 2. Categories, Collections, and Tags

Wallpapers are now organized using a structured database hierarchy.

- **Categories:** The highest organizational layer, representing large groupings like Landscapes, Space, Games, or Anime.
- **Collections:** Mid-level albums nested inside categories (for example, a Cyberpunk album located within the Games category).
- **Tags:** A many-to-many indexing system allowing wallpapers to be assigned tags (such as 4K, Dark, Minimal) for cross-referencing.
- **Slide-out Detail Drawer:** Clicking a wallpaper card in the catalog slides out a metadata panel showing resolutions, sizes, aspect ratios, and fields to edit categories, collections, or tags inline.
- **Inline Items Creation:** You can create new categories, collections, and tags directly from the details panel without navigating away.

---

## 3. Offline-First Architecture and Background Sync

The application no longer requires a constant server connection.

- **Local Metadata Cache:** All metadata is saved in a JSON file cache inside the user directory. Browsing and editing your library is fully functional offline.
- **Background Sync Queue:** Operations executed while offline are queued in a local changes array. When the sync API becomes reachable, the queue is processed, resolving local temporary IDs to database-generated IDs.
- **Connection Indicator:** A status dot in the sidebar footer changes color dynamically to reflect connection health:
  - Green: Connected (API reachable and synchronized).
  - Yellow: Working Offline (Offline with pending local changes queued for sync).
  - Red: Server Unreachable (Offline, or server URL is not configured).

---

## 4. Smart Slideshows and Media Card

- **slideshow Player Card:** A media card sits at the top of the sidebar. It features Play/Pause button icons and a skip-next button to cycle wallpapers instantly.
- **Smart Filtering:** You can filter slideshow rotations to run within a specific category, collection, or your favorites playlist.
- **Flexible Ordering:** The rotation order can be configured to sequential, random, shuffle, or newest first.

---

## 5. Reviews and Analytics

- **Feedback Modal:** After changing your desktop wallpaper 5 times, the client application prompts for a rating and optional comments.
- **Web Analytics:** Ratings are posted to the Next.js server and displayed on the administration portal dashboard, displaying average scores, review counts, and recent comments.

---

## 6. Under the Hood Changes

- **Single Instance Lock:** Initiated at the absolute top of the Electron startup script to prevent multiple app instances from launching simultaneously.
- **API Token Auth:** All Next.js POST write routes now authorize operations using the sync token header.
- **Environment Config:** Secure variables are maintained in the environment files instead of being hardcoded in scripts.
