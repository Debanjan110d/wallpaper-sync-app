import fs from "node:fs/promises";
import path from "node:path";

export type AnalyticsEvent = "visit" | "download_click";

export type AnalyticsSnapshot = {
  visitsTotal: number;
  downloadClicksTotal: number;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "analytics.json");

const DEFAULT_SNAPSHOT: AnalyticsSnapshot = {
  visitsTotal: 0,
  downloadClicksTotal: 0,
  updatedAt: new Date(0).toISOString(),
};

type GlobalWithAnalytics = typeof globalThis & {
  __wallpaperSyncAnalytics?: {
    snapshot: AnalyticsSnapshot;
    writeChain: Promise<void>;
    diskEnabled: boolean;
  };
};

function getGlobalState() {
  const g = globalThis as GlobalWithAnalytics;
  if (!g.__wallpaperSyncAnalytics) {
    g.__wallpaperSyncAnalytics = {
      snapshot: { ...DEFAULT_SNAPSHOT },
      writeChain: Promise.resolve(),
      diskEnabled: true,
    };
  }
  return g.__wallpaperSyncAnalytics;
}

async function readFromDisk(): Promise<AnalyticsSnapshot> {
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);

  return {
    visitsTotal: Number(parsed?.visitsTotal) || 0,
    downloadClicksTotal: Number(parsed?.downloadClicksTotal) || 0,
    updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
  } satisfies AnalyticsSnapshot;
}

async function writeToDisk(snapshot: AnalyticsSnapshot): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(snapshot, null, 2), "utf8");
}

export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const state = getGlobalState();
  if (!state.diskEnabled) return state.snapshot;

  try {
    const disk = await readFromDisk();
    state.snapshot = disk;
    return disk;
  } catch {
    // If disk is not readable (serverless / readonly / first run), fall back to memory.
    return state.snapshot;
  }
}

export async function trackAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  const state = getGlobalState();

  const applyEvent = (s: AnalyticsSnapshot): AnalyticsSnapshot => {
    const next: AnalyticsSnapshot = {
      ...s,
      updatedAt: new Date().toISOString(),
    };

    if (event === "visit") next.visitsTotal += 1;
    if (event === "download_click") next.downloadClicksTotal += 1;

    return next;
  };

  state.snapshot = applyEvent(state.snapshot);

  // Serialize writes to avoid concurrent write corruption.
  state.writeChain = state.writeChain
    .catch(() => undefined)
    .then(async () => {
      if (!state.diskEnabled) return;
      try {
        await writeToDisk(state.snapshot);
      } catch {
        // If writing fails (common on serverless), keep in-memory only.
        state.diskEnabled = false;
      }
    });

  await state.writeChain;
}
