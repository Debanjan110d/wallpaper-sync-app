# Wallpaper Sync

<p align="center">
  <img src="icon.png" alt="Wallpaper Sync Logo" width="160" height="160" />
</p>

<p align="center">
  <em>A lightweight Windows desktop app that rotates and syncs wallpapers.</em>
</p>

<p align="center">
  <a href="https://github.com/Debanjan110d/wallpaper-sync-app/releases">
    <strong>Download Latest Version »</strong>
  </a>
</p>

Wallpaper Sync is an Electron tray app that can:

- rotate wallpapers from your local collection
- let you drag & drop new wallpapers into the app
- optionally sync a wallpaper collection from a server API

This repo also contains an optional Next.js + Supabase web app under `web/` that exposes the API the desktop app consumes.

## Features

- Drag & drop images directly into the app
- Automatic wallpaper rotation
- Customizable change intervals
- Simple image management (delete & organize)
- Runs silently in the system tray

## Project structure

- Desktop app (Electron): root folder (`main.js`, `ui/`, `wallpaperManager.js`)
- Optional server/API + admin dashboard: `web/` (Next.js + Supabase)

## Running locally (desktop app)

Prerequisites: Node.js (v20 recommended)

```bash
npm ci
npm start
```

## Running locally (optional server)

The desktop app syncs from an API URL (defaults to `http://localhost:3000/api/wallpapers`).

You can override it either by:

- setting `apiUrl` in the desktop app settings file (stored in Electron's `userData` directory as `settings.json`), or
- setting the env var `WALLPAPER_SYNC_API_URL`.

If your web API is protected, you can also set `syncToken` in that same settings file (or `WALLPAPER_SYNC_TOKEN` as an env var).

1. Install and run the Next.js app:

```bash
cd web
npm ci
npm run dev
```

1. Create `web/.env.local` with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never expose this key)
- `ADMIN_PASSWORD` (simple admin login used by `/login`)

## Deploying the web app to Vercel

1) In Vercel, import the repo and set **Root Directory** to `web/`.

2) Set the Node.js version to **20+** (Supabase packages require Node 20+).

3) Add these environment variables in Vercel (Project → Settings → Environment Variables):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `SYNC_TOKEN` (optional, but recommended if your desktop app will sync from this API)

After deployment, visit `/login` on your Vercel domain.

Security note: the current admin auth is intentionally minimal (password + cookie). If you plan to expose this publicly, consider upgrading it to signed tokens or proper user auth.

## Build

```bash
npm run dist
```

The Windows installer will be generated in `dist/`.

## Automated releases (GitHub Actions)

Releases are fully automated from tags and use `CHANGELOG.md` as release notes.

The release workflow triggers on `push` of tags matching `v*` (example: `v2.0.1`).

1. Bump the version in root `package.json` (example: `2.0.1`)
1. Add/update the matching section heading in `CHANGELOG.md` (example: `## 2.0.1`)
1. Commit those changes
1. Create and push a git tag like `v2.0.1`

Example commands:

```bash
git status
git add -A
git commit -m "release: v2.0.1"

# annotated tag is recommended
git tag -a v2.0.1 -m "v2.0.1"

git push origin main
git push origin v2.0.1
```

When you push the tag, GitHub Actions will:

- build the Windows artifacts
- create a GitHub Release (non-draft)
- attach the generated installer files
- set the release body from the `CHANGELOG.md` section for that version

## Contributing

See `CONTRIBUTING.md` for setup, workflow, and release/changelog rules.

## License

MIT
