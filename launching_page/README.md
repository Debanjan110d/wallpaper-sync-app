# Wallpaper Sync — Launching Page

This folder is a standalone Next.js single-page marketing site intended for Vercel.

## Local dev

```bash
cd launching_page
npm install
npm run dev
```

## Deploy to Vercel

- Import the repo in Vercel
- Set **Root Directory** to `launching_page/`
- Build Command: `npm run build`
- Output: Next.js default

## Screenshots

Drop screenshots into `launching_page/public/screenshots/`.

## Auto-updating downloads/updates

The page reads GitHub Releases from:
<https://api.github.com/repos/Debanjan110d/wallpaper-sync-app/releases>

It is cached for ~30 minutes (see `app/_lib/githubReleases.ts`).
