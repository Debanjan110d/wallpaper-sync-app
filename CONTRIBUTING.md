# Contributing

Thanks for your interest in contributing to **Wallpaper Sync**.

## What’s in this repo

- **Desktop app (Electron)**: root folder
- **Optional server/admin dashboard (Next.js + Supabase)**: `web/`

You can contribute to either (or both).

## Prerequisites

- Node.js v20 (recommended)
- Windows (recommended for building the desktop installer)

## Development setup

### Desktop app

```bash
npm ci
npm start
```

### Web app (optional)

```bash
cd web
npm ci
npm run dev
```

Create `web/.env.local` (do not commit this file):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`

Security note: `SUPABASE_SERVICE_ROLE_KEY` is extremely sensitive. It must only be used server-side and must never be exposed to the client.

## Coding guidelines

- Keep changes focused and small.
- Prefer clear, descriptive names.
- Avoid adding new dependencies unless necessary.
- Update docs when behavior changes.

## Pull requests

1. Fork the repo and create a feature branch.
2. Make your changes.
3. Ensure CI passes (see “CI” below).
4. Open a PR with:
   - what you changed
   - why you changed it
   - how to test it

## CI

GitHub Actions runs:

- Desktop: `npm ci` + `npm run pack`
- Web: `cd web && npm ci && npm run lint && npm run build`

If your change affects the desktop build, please test `npm run dist` locally when possible.

## Changelog rules

This project uses `CHANGELOG.md` as the source of truth for GitHub Release notes.

- Every release must have a matching section heading, e.g. `## 1.0.5`.
- Keep entries user-facing (what changed, what was fixed, what was added).

## Release process (maintainers)

Releases are automated.

1. Update root `package.json` version.
2. Add the matching `## x.y.z` section to `CHANGELOG.md`.
3. Create and push a tag `vX.Y.Z`.

Pushing the tag triggers the release workflow, which:

- builds the Windows artifacts
- creates a non-draft GitHub Release
- uploads the `dist/` artifacts
- uses the `CHANGELOG.md` entry for that version as the release description

Example:

```bash
git add -A
git commit -m "release: v2.0.1"
git tag -a v2.0.1 -m "v2.0.1"
git push origin main
git push origin v2.0.1
```
