import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { assignWallpaperToCollections, recountCollectionWallpapers } from "@/utils/aiProcessor";

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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch wallpapers
    const { data: wallpapers, error: wpErr } = await supabaseAdmin
      .from("wallpapers")
      .select("id, title, description, quality");

    if (wpErr) {
      return NextResponse.json({ error: wpErr.message }, { status: 500 });
    }

    if (!wallpapers || wallpapers.length === 0) {
      return NextResponse.json({ success: true, message: "No wallpapers available for assignment." });
    }

    console.log(`[Assign Collections API] Re-assigning ${wallpapers.length} wallpapers...`);

    for (const wp of wallpapers) {
      // Fetch tags
      const { data: tagsData } = await supabaseAdmin
        .from("wallpaper_tags")
        .select("tags(name)")
        .eq("wallpaper_id", wp.id);
      
      const tags = tagsData ? tagsData.map((t: any) => t.tags?.name).filter(Boolean) : [];

      await assignWallpaperToCollections(
        wp.id,
        {
          title: wp.title,
          description: wp.description,
          tags,
        },
        supabaseAdmin
      );
    }

    // Recount collection wallpaper counts
    await recountCollectionWallpapers(supabaseAdmin);

    return NextResponse.json({
      success: true,
      message: `Successfully re-evaluated collection assignments for ${wallpapers.length} wallpapers.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
