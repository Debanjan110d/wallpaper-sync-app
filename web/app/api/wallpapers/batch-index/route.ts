import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { processWallpaperAI } from "@/utils/aiProcessor";

function getMimeType(storagePath: string): string {
  const pathLower = storagePath.toLowerCase();
  if (pathLower.endsWith(".png")) return "image/png";
  if (pathLower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
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

    // Only administrators or authentic client sync processes can run batch indexing
    if (!isAdminSession && (!isSyncTokenConfigured || !isValidSyncToken)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch wallpapers that are either status='uploaded' or have missing AI metadata (indexed_at is null)
    const { data: wallpapers, error: fetchErr } = await supabaseAdmin
      .from("wallpapers")
      .select("id, file_name, storage_path, status")
      .neq("status", "deleted")
      .or("indexed_at.is.null,status.eq.uploaded");

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

    // Run batch indexing asynchronously in the background to avoid API timeouts
    (async () => {
      console.log(`Starting batch AI indexing for ${wallpapersToProcess.length} wallpapers.`);
      
      for (const wp of wallpapersToProcess) {
        try {
          const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
            .from("wallpapers")
            .download(wp.storage_path);

          if (downloadErr || !fileData) {
            console.error(`[Batch Index] Failed to download image ${wp.storage_path}:`, downloadErr?.message);
            continue;
          }

          const arrayBuffer = await fileData.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = getMimeType(wp.storage_path);

          console.log(`[Batch Index] Processing wallpaper ID ${wp.id} (${wp.file_name})`);
          const res = await processWallpaperAI(wp.id, buffer, mimeType);

          if (!res.success) {
            console.error(`[Batch Index] AI processing failed for wallpaper ID ${wp.id}:`, res.error);
          }

          // Throttle to respect free-tier/low-rate Gemini API limits (1.5 seconds)
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } catch (err) {
          console.error(`[Batch Index] Error processing wallpaper ID ${wp.id}:`, err);
        }
      }

      console.log("[Batch Index] Batch AI indexing run completed.");
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
