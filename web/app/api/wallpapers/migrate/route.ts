import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { processWallpaperAI } from "@/utils/aiProcessor";
import fs from "fs";
import path from "path";
import os from "os";

const progressFilePath = path.join(os.tmpdir(), "migration_progress.json");

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
        // ignore
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

    // Check if migration is already active
    const currentProgress = getProgress();
    if (currentProgress.active) {
      return NextResponse.json({ error: "Migration is already running." }, { status: 400 });
    }

    let forceAll = false;
    try {
      const body = await request.json();
      if (body && body.forceAll === true) {
        forceAll = true;
      }
    } catch (e) {
      // Body may be empty
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch wallpapers
    let query = supabaseAdmin
      .from("wallpapers")
      .select("id, file_name, storage_path, status, hash")
      .neq("status", "deleted");

    if (!forceAll) {
      // Only process unindexed wallpapers
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
        message: "All wallpapers are already fully indexed. No migration needed.",
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

    // Run background migration process
    (async () => {
      console.log(`[Migration] Starting AI migration for ${wallpapersToProcess.length} wallpapers.`);
      
      for (let i = 0; i < wallpapersToProcess.length; i++) {
        const wp = wallpapersToProcess[i];

        // Check if aborted
        if (!getProgress().active) {
          console.log("[Migration] Migration run aborted by user request.");
          break;
        }
        
        progress.currentWallpaper = wp.file_name || wp.storage_path || `ID: ${wp.id}`;
        saveProgress(progress);

        try {
          // Download wallpaper from storage
          const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
            .from("wallpapers")
            .download(wp.storage_path);

          if (!getProgress().active) break;

          if (downloadErr || !fileData) {
            console.error(`[Migration] Download failed for ${wp.storage_path}:`, downloadErr?.message);
            progress.failed++;
            saveProgress(progress);
            continue;
          }

          const arrayBuffer = await fileData.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = getMimeType(wp.storage_path);

          console.log(`[Migration] Processing wallpaper ID ${wp.id} (${wp.file_name})`);
          const res = await processWallpaperAI(wp.id, buffer, mimeType);

          if (!getProgress().active) break;

          if (!res.success) {
            console.error(`[Migration] AI indexing failed for wallpaper ID ${wp.id}:`, res.error);
            progress.failed++;
          } else {
            progress.processed++;
          }
        } catch (err) {
          console.error(`[Migration] Error processing wallpaper ID ${wp.id}:`, err);
          if (!getProgress().active) break;
          progress.failed++;
        }
        saveProgress(progress);

        // Throttle to prevent rate limit limits (1.5 seconds)
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Final progress cleanup
      const finalCheck = getProgress();
      if (finalCheck.active) {
        progress.active = false;
        progress.currentWallpaper = "";
        saveProgress(progress);
        console.log("[Migration] AI migration completed successfully.");
      } else {
        console.log("[Migration] AI migration finished in aborted state.");
      }
    })();

    return NextResponse.json({
      success: true,
      message: `AI migration started in background for ${wallpapersToProcess.length} wallpapers.`,
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

    return NextResponse.json({ success: true, message: "Migration aborted successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
