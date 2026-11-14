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
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-sync-token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export interface BroadcastItem {
  id: string;
  title: string;
  message: string;
  type: "announcement" | "update" | "alert" | "tip";
  priority?: "normal" | "high" | "urgent";
  actionType?: "sync" | "link" | "dismiss";
  actionLabel?: string;
  actionUrl?: string;
  createdAt: string;
  expiresAt?: string | null;
  active: boolean;
}

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

async function getStoredBroadcasts(supabase: any): Promise<BroadcastItem[]> {
  try {
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("reviews")
      .download("broadcasts.json");

    if (!downloadErr && fileData) {
      const text = await fileData.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Storage download broadcasts error:", e);
  }
  return [];
}

async function saveStoredBroadcasts(supabase: any, list: BroadcastItem[]): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from("reviews")
      .upload("broadcasts.json", JSON.stringify(list, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    return !error;
  } catch (e) {
    console.error("Storage upload broadcasts error:", e);
    return false;
  }
}

// GET: Retrieve broadcasts for desktop clients and admin
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const isAdmin = await verifyAdminAuth(request);

    const supabase = getSupabaseClient();
    const all = await getStoredBroadcasts(supabase);

    const now = Date.now();
    const filtered = all.filter((b) => {
      if (includeInactive && isAdmin) return true;
      if (!b.active) return false;
      if (b.expiresAt) {
        const expTime = new Date(b.expiresAt).getTime();
        if (!Number.isNaN(expTime) && expTime < now) return false;
      }
      return true;
    });

    return NextResponse.json(
      { broadcasts: filtered, total: filtered.length },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("GET /api/broadcasts error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve broadcasts", broadcasts: [] },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Publish a new broadcast announcement (Admin only)
export async function POST(request: Request) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Admin credentials or valid sync token required." },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const {
      title,
      message,
      type = "announcement",
      priority = "normal",
      actionType = "sync",
      actionLabel,
      actionUrl,
      expiresAt = null,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Broadcast title and message are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const newBroadcast: BroadcastItem = {
      id: `bc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: String(title).trim(),
      message: String(message).trim(),
      type: ["announcement", "update", "alert", "tip"].includes(type) ? type : "announcement",
      priority: ["normal", "high", "urgent"].includes(priority) ? priority : "normal",
      actionType: ["sync", "link", "dismiss"].includes(actionType) ? actionType : "sync",
      actionLabel: actionLabel ? String(actionLabel).trim() : (actionType === "sync" ? "Sync Library Now" : "View Details"),
      actionUrl: actionUrl ? String(actionUrl).trim() : "",
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      active: true,
    };

    const supabase = getSupabaseClient();
    const existing = await getStoredBroadcasts(supabase);
    existing.unshift(newBroadcast);

    const saved = await saveStoredBroadcasts(supabase, existing);
    if (!saved) {
      return NextResponse.json(
        { error: "Failed to persist broadcast to storage." },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, broadcast: newBroadcast },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("POST /api/broadcasts error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create broadcast" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE: Deactivate or remove a broadcast (Admin only)
export async function DELETE(request: Request) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Broadcast ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const existing = await getStoredBroadcasts(supabase);
    const updated = existing.filter((b) => b.id !== id);

    await saveStoredBroadcasts(supabase, updated);

    return NextResponse.json({ success: true, deletedId: id }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("DELETE /api/broadcasts error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete broadcast" },
      { status: 500, headers: corsHeaders }
    );
  }
}

