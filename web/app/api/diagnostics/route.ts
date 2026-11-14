import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase credentials not configured");
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

export interface DiagnosticReport {
  id: string;
  appVersion: string;
  osPlatform: string;
  osRelease: string;
  arch: string;
  nodeVersion?: string;
  electronVersion?: string;
  errorCount: number;
  logs: string;
  submittedAt: string;
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

async function getStoredDiagnostics(supabase: any): Promise<DiagnosticReport[]> {
  try {
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("reviews")
      .download("diagnostics.json");

    if (downloadErr || !fileData) return [];
    const text = await fileData.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveStoredDiagnostics(supabase: any, reports: DiagnosticReport[]) {
  // Cap at the latest 150 reports to avoid uncontrolled storage growth
  const capped = reports.slice(0, 150);
  const blob = new Blob([JSON.stringify(capped, null, 2)], { type: "application/json" });

  await supabase.storage.from("reviews").upload("diagnostics.json", blob, {
    upsert: true,
    contentType: "application/json",
  });
}

/**
 * GET /api/diagnostics
 * Returns the list of submitted weekly error reports (Admin only).
 */
export async function GET(request: Request) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const supabase = getSupabaseClient();
    const reports = await getStoredDiagnostics(supabase);

    return NextResponse.json({ reports }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve diagnostics" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/diagnostics
 * Receives an anonymous weekly error log from a desktop app instance that opted in.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appVersion, osPlatform, osRelease, arch, errorCount, logs, submittedAt } = body;

    if (!logs || typeof logs !== "string") {
      return NextResponse.json(
        { error: "No diagnostic log data provided" },
        { status: 400, headers: corsHeaders }
      );
    }

    const report: DiagnosticReport = {
      id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      appVersion: String(appVersion || "5.1.0"),
      osPlatform: String(osPlatform || "win32"),
      osRelease: String(osRelease || "unknown"),
      arch: String(arch || "x64"),
      nodeVersion: body.nodeVersion,
      electronVersion: body.electronVersion,
      errorCount: Number(errorCount) || 1,
      logs: String(logs).slice(0, 50_000), // Protect against excessive payloads
      submittedAt: submittedAt || new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    const existing = await getStoredDiagnostics(supabase);
    existing.unshift(report);
    await saveStoredDiagnostics(supabase, existing);

    return NextResponse.json(
      { success: true, message: "Diagnostic report received successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to record diagnostic report" },
      { status: 500, headers: corsHeaders }
    );
  }
}
