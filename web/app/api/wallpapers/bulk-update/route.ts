import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { recountCollectionWallpapers } from "@/utils/aiProcessor";

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

    const { items } = await request.json();
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items format" }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY is missing in the environment" },
        { status: 500 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const item of items) {
      const {
        id,
        collection_id,
        tags,
        title,
        description,
        characters,
        franchises,
        styles,
        moods,
        primary_color,
        collection_ids // Multiple collections list
      } = item;

      if (!id) {
        results.push({ status: "failed", error: "Missing wallpaper ID" });
        failed++;
        continue;
      }

      try {
        const updateData: any = {};

        // 1. Resolve direct update columns
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        
        // Resolve collection update
        const effectiveCollectionIds = collection_ids !== undefined 
          ? collection_ids 
          : (collection_id !== undefined ? (collection_id ? [collection_id] : []) : undefined);

        // Apply wallpaper table update
        if (Object.keys(updateData).length > 0) {
          const { error: updateErr } = await supabase
            .from("wallpapers")
            .update(updateData)
            .eq("id", id);
          if (updateErr) {
            throw new Error(`Failed to update fields: ${updateErr.message}`);
          }
        }

        // 2. Many-to-many collection links
        if (effectiveCollectionIds !== undefined && Array.isArray(effectiveCollectionIds)) {
          // Clear current assignments
          const { error: delColErr } = await supabase
            .from("wallpaper_collections")
            .delete()
            .eq("wallpaper_id", id);

          if (delColErr) {
            throw new Error(`Failed to clear collections: ${delColErr.message}`);
          }

          if (effectiveCollectionIds.length > 0) {
            const insertRows = effectiveCollectionIds.map((colId: any) => ({
              wallpaper_id: id,
              collection_id: Number(colId),
            }));

            const { error: insColErr } = await supabase
              .from("wallpaper_collections")
              .insert(insertRows);

            if (insColErr) {
              throw new Error(`Failed to assign collections: ${insColErr.message}`);
            }
          }
        }

        // 3. Update tags
        if (tags !== undefined && Array.isArray(tags)) {
          const { error: deleteErr } = await supabase
            .from("wallpaper_tags")
            .delete()
            .eq("wallpaper_id", id);

          if (deleteErr) {
            throw new Error(`Failed to clear tags: ${deleteErr.message}`);
          }

          if (tags.length > 0) {
            const insertRows = tags.map((tagId: any) => ({
              wallpaper_id: id,
              tag_id: Number(tagId),
            }));

            const { error: insertErr } = await supabase
              .from("wallpaper_tags")
              .insert(insertRows);

            if (insertErr) {
              throw new Error(`Failed to save tags: ${insertErr.message}`);
            }
          }
        }

        results.push({ id, status: "success" });
        successful++;
      } catch (err: any) {
        results.push({ id, status: "failed", error: err.message });
        failed++;
      }
    }

    // Recount wallpaper_count for modified collections
    await recountCollectionWallpapers(supabase);

    return NextResponse.json({
      summary: {
        total: items.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
