import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { processWallpaperAI } from "@/utils/aiProcessor";
import fs from "fs";
import path from "path";
import os from "os";

const progressFilePath = path.join(process.cwd(), "indexing_progress.json");

function getMimeType(storagePath: string): string {
  const pathLower = storagePath.toLowerCase();
  if (pathLower.endsWith(".png")) return "image/png";
  if (pathLower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function getProgress() {
  try {
    if (fs.existsSync(progressFilePath)) {
      const data = fs.readFileSync(progressFilePath, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to read progress file:", e);
  }
  return { active: false, total: 0, processed: 0, failed: 0, currentWallpaper: "" };
}

function saveProgress(progress: any) {
  try {
    if (fs.existsSync(progressFilePath)) {
      try {
        const fileContent = fs.readFileSync(progressFilePath, "utf8");
        const currentData = JSON.parse(fileContent);
        if (currentData && currentData.active === false) {
          progress.active = false;
        }
      } catch (e) {
        // Ignore read/parse errors
      }
    }
    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to write progress file:", e);
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");

    const syncToken = (process.env.SYNC_TOKEN || "").trim();
    const requestToken = (request.headers.get("x-sync-token") || "").trim();

    const isAdminSession = !!session && session.value === "true";
    const isSyncTokenConfigured = syncToken.length > 0;
    const isValidSyncToken = isSyncTokenConfigured && requestToken === syncToken;

    if (!isAdminSession && (!isSyncTokenConfigured || !isValidSyncToken)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const progress = getProgress();
    return NextResponse.json(progress);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");

    const syncToken = (process.env.SYNC_TOKEN || "").trim();
    const requestToken = (request.headers.get("x-sync-token") || "").trim();

    const isAdminSession = !!session && session.value === "true";
    const isSyncTokenConfigured = syncToken.length > 0;
    const isValidSyncToken = isSyncTokenConfigured && requestToken === syncToken;

    if (!isAdminSession && (!isSyncTokenConfigured || !isValidSyncToken)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if an indexing run is already active
    const currentProgress = getProgress();
    if (currentProgress.active) {
      return NextResponse.json({ error: "Indexing is already running." }, { status: 400 });
    }

    // Parse request body for reindexAll and provider
    let reindexAll = false;
    let provider: "gemini" | "imagga" | undefined = undefined;
    try {
      const body = await request.json();
      if (body) {
        if (body.reindexAll === true) {
          reindexAll = true;
        }
        if (body.provider === "gemini" || body.provider === "imagga") {
          provider = body.provider;
        }
      }
    } catch (e) {
      // Body may be empty or not JSON, ignore
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch wallpapers: if reindexAll is true, fetch all non-deleted wallpapers.
    // Otherwise, fetch wallpapers that are either status='uploaded' or have missing AI metadata (indexed_at is null)
    let query = supabaseAdmin
      .from("wallpapers")
      .select("id, file_name, storage_path, status")
      .neq("status", "deleted");

    if (!reindexAll) {
      query = query.or("indexed_at.is.null,status.eq.uploaded");
    }

    const { data: wallpapers, error: fetchErr } = await query;

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const wallpapersToProcess = (wallpapers || []).filter((wp) => !!wp.storage_path);

    if (wallpapersToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No wallpapers require AI indexing. All wallpapers are up to date.",
      });
    }

    // Initialize progress state
    const progress = {
      active: true,
      total: wallpapersToProcess.length,
      processed: 0,
      failed: 0,
      currentWallpaper: "",
      started_at: new Date().toISOString()
    };
    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2), "utf8");

    // Run batch indexing asynchronously in the background to avoid API timeouts
    (async () => {
      console.log(`Starting batch AI indexing for ${wallpapersToProcess.length} wallpapers. ReindexAll: ${reindexAll}`);
      
      for (let i = 0; i < wallpapersToProcess.length; i++) {
        const wp = wallpapersToProcess[i];

        // Check if run has been aborted
        if (!getProgress().active) {
          console.log("[Batch Index] Batch AI indexing run aborted by user request.");
          break;
        }
        
        // Update current wallpaper name in progress
        progress.currentWallpaper = wp.file_name || wp.storage_path || `ID: ${wp.id}`;
        saveProgress(progress);

        try {
          const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
            .from("wallpapers")
            .download(wp.storage_path);

          // Check abort after network request
          if (!getProgress().active) {
            console.log("[Batch Index] Batch AI indexing run aborted during download.");
            break;
          }

          if (downloadErr || !fileData) {
            console.error(`[Batch Index] Failed to download image ${wp.storage_path}:`, downloadErr?.message);
            progress.failed++;
            saveProgress(progress);
            continue;
          }

          const arrayBuffer = await fileData.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = getMimeType(wp.storage_path);

          console.log(`[Batch Index] Processing wallpaper ID ${wp.id} (${wp.file_name}) using ${provider || "default"} provider`);
          const res = await processWallpaperAI(wp.id, buffer, mimeType, provider);

          // Check abort after AI processing
          if (!getProgress().active) {
            console.log("[Batch Index] Batch AI indexing run aborted during AI processing.");
            break;
          }

          if (!res.success) {
            console.error(`[Batch Index] AI processing failed for wallpaper ID ${wp.id}:`, res.error);
            progress.failed++;
          } else {
            progress.processed++;
          }
        } catch (err) {
          console.error(`[Batch Index] Error processing wallpaper ID ${wp.id}:`, err);
          if (!getProgress().active) {
            console.log("[Batch Index] Batch AI indexing run aborted inside catch block.");
            break;
          }
          progress.failed++;
        }
        saveProgress(progress);

        // Throttle to respect free-tier/low-rate Gemini API limits (1.5 seconds)
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Mark indexing run as complete if it wasn't aborted
      const finalCheck = getProgress();
      if (finalCheck.active) {
        progress.active = false;
        progress.currentWallpaper = "";
        saveProgress(progress);
        console.log("[Batch Index] Batch AI indexing run completed.");
      } else {
        console.log("[Batch Index] Batch AI indexing run finished in aborted state.");
      }
    })();

    return NextResponse.json({
      success: true,
      message: `Batch AI indexing started in the background for ${wallpapersToProcess.length} wallpapers.`,
      processing_count: wallpapersToProcess.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");

    const syncToken = (process.env.SYNC_TOKEN || "").trim();
    const requestToken = (request.headers.get("x-sync-token") || "").trim();

    const isAdminSession = !!session && session.value === "true";
    const isSyncTokenConfigured = syncToken.length > 0;
    const isValidSyncToken = isSyncTokenConfigured && requestToken === syncToken;

    if (!isAdminSession && (!isSyncTokenConfigured || !isValidSyncToken)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const progress = getProgress();
    progress.active = false;
    progress.currentWallpaper = "";
    saveProgress(progress);

    return NextResponse.json({ success: true, message: "AI indexing aborted successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
