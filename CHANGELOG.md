# Changelog

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
