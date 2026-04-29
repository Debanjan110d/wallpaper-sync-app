# Changelog

All notable changes to this project will be documented in this file.

## 1.0.5

### Fixed
* Fixed wallpaper sync failing with `HTTP 401 Unauthorized` when the server API is protected (desktop can send `x-sync-token`; API allows public reads when `SYNC_TOKEN` is not configured).
* Fixed tray "Open Dashboard" not showing the hidden window.
* Improved error reporting so sync failures are shown in the UI instead of looking like "Already up to date".

## 1.0.4

### Fixed
* Fixed an issue where setting the wallpaper would fail ("File might be invalid") because the system could not execute the wallpaper binary from within the packaged application archive.

### Changed
* Updated GitHub release configuration to automatically publish full releases rather than drafts.
* Extracted the `wallpaper` library outside the ASAR bundle during the build process to resolve execution path errors.

### Added
* Added this `CHANGELOG.md` file to automatically populate GitHub release notes.

## 1.0.3

* Initial background app and slideshow functionality.
