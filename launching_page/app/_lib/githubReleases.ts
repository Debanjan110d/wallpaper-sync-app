export type GitHubReleaseAsset = {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
};

export type GitHubRelease = {
  id: number;
  tag_name: string;
  name: string | null;
  html_url: string;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  assets: GitHubReleaseAsset[];
};

const OWNER = "Debanjan110d";
const REPO = "wallpaper-sync-app";

export function getReleasePageUrl() {
  return `https://github.com/${OWNER}/${REPO}/releases`;
}

export async function fetchReleases(): Promise<GitHubRelease[]> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/releases`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
    },
    // Cache for a bit so the page updates automatically without hammering GitHub.
    next: { revalidate: 60 * 30 },
  });

  if (!res.ok) {
    throw new Error(`GitHub releases fetch failed: ${res.status}`);
  }

  const releases = (await res.json()) as GitHubRelease[];
  return releases.filter((r) => !r.draft);
}

export function pickPrimaryAsset(assets: GitHubReleaseAsset[]) {
  const byExt = (ext: string) =>
    assets.find((a) => a.name.toLowerCase().endsWith(ext));

  return (
    byExt(".exe") ||
    byExt(".msi") ||
    byExt(".zip") ||
    assets[0] ||
    null
  );
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx++;
  }
  return `${size.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function extractHighlights(markdown: string | null, max = 4): string[] {
  if (!markdown) return [];
  const lines = markdown
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bullets = lines
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, ""))
    .filter((l) => l.length > 0);

  if (bullets.length > 0) return bullets.slice(0, max);

  // Fallback: first non-empty lines, stripped of markdown headings
  const plain = lines
    .filter((l) => !l.startsWith("#"))
    .map((l) => l.replace(/`/g, ""))
    .slice(0, max);

  return plain;
}
