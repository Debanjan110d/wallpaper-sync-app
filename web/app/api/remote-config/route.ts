import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are missing");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-sync-token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export interface RemoteConfig {
  version: string;
  updatedAt: string;
  banner: {
    enabled: boolean;
    id: string;
    text: string;
    type: "info" | "warning" | "success" | "purple";
    actionLabel?: string;
    actionUrl?: string;
    dismissible?: boolean;
  };
  spotlightCollection?: string;
  seasonalTheme?: {
    enabled: boolean;
    name?: string;
    primary?: string;
    glow?: string;
  };
  recommendedSyncInterval?: number;
  remoteCommands?: {
    id: string;
    action: "force_resync" | "clear_thumbnail_cache" | "ping";
    issuedAt: string;
    targetVersion?: string;
  }[];
}

const DEFAULT_CONFIG: RemoteConfig = {
  version: "1.0.0",
  updatedAt: new Date().toISOString(),
  banner: {
    enabled: true,
    id: "banner-v510",
    text: "✨ Wallpaper Sync v5.2.0: 730+ 4K wallpapers streaming with ultra-low RAM footprint & Orientation Safe Switch!",
    type: "info",
    actionLabel: "View Docs",
    actionUrl: "https://wallpaper-sync-app.vercel.app/docs",
    dismissible: true,
  },
  spotlightCollection: "Anime Art",
  seasonalTheme: {
    enabled: false,
    name: "Holiday Neon",
    primary: "#ff2d55",
    glow: "rgba(255, 45, 85, 0.4)",
  },
  recommendedSyncInterval: 21600000,
  remoteCommands: [],
};

async function verifyAdminAuth(request: Request): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");
    if (session && session.value === "true") return true;

    const requestToken = (request.headers.get("x-sync-token") || "").trim();
    const syncToken = (process.env.SYNC_TOKEN || "").trim();
    if (syncToken && requestToken === syncToken) return true;

    return false;
  } catch {
    return false;
  }
}

async function getStoredConfig(supabase: any): Promise<RemoteConfig> {
  try {
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("reviews")
      .download("remote_config.json");

    if (!downloadErr && fileData) {
      const text = await fileData.text();
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    console.error("Storage download remote_config error:", e);
  }
  return DEFAULT_CONFIG;
}

async function saveStoredConfig(supabase: any, cfg: RemoteConfig): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from("reviews")
      .upload("remote_config.json", JSON.stringify(cfg, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    return !error;
  } catch (e) {
    console.error("Storage upload remote_config error:", e);
    return false;
  }
}

// GET: Fetch live remote configuration for desktop apps
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const config = await getStoredConfig(supabase);
    return NextResponse.json({ config }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("GET /api/remote-config error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load remote configuration", config: DEFAULT_CONFIG },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Update dynamic remote configuration & dispatch commands (Admin only)
export async function POST(request: Request) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Admin credentials or valid sync token required." },
        { status: 401, headers: corsHeaders }
      );
    }

    const updates = await request.json();
    const supabase = getSupabaseClient();
    const current = await getStoredConfig(supabase);

    const merged: RemoteConfig = {
      ...current,
      ...updates,
      banner: {
        ...current.banner,
        ...(updates.banner || {}),
      },
      seasonalTheme: {
        ...current.seasonalTheme,
        ...(updates.seasonalTheme || {}),
      },
      updatedAt: new Date().toISOString(),
    };

    // If an action command was dispatched in updates (e.g. command: 'force_resync' | 'clear_thumbnail_cache')
    if (updates.newCommand) {
      if (!Array.isArray(merged.remoteCommands)) merged.remoteCommands = [];
      merged.remoteCommands.unshift({
        id: `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        action: updates.newCommand,
        issuedAt: new Date().toISOString(),
      });
      // Keep at most 10 recent commands
      merged.remoteCommands = merged.remoteCommands.slice(0, 10);
    }

    const saved = await saveStoredConfig(supabase, merged);
    if (!saved) {
      return NextResponse.json(
        { error: "Failed to persist remote configuration to storage." },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, config: merged },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("POST /api/remote-config error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update remote configuration" },
      { status: 500, headers: corsHeaders }
    );
  }
}

