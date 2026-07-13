import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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
      const { id, collection_id, category_id, tags } = item;
      if (!id) {
        results.push({ status: "failed", error: "Missing wallpaper ID" });
        failed++;
        continue;
      }

      try {
        let finalCollectionId = collection_id;

        if (category_id !== undefined && category_id !== null && !finalCollectionId) {
          // Resolve category_id to a collection_id
          const { data: categoryData, error: catErr } = await supabase
            .from("categories")
            .select("name")
            .eq("id", category_id)
            .single();
            
          if (!catErr && categoryData) {
            const { data: existingCols, error: colsErr } = await supabase
              .from("collections")
              .select("id, name")
              .eq("category_id", category_id);
              
            if (!colsErr && existingCols) {
              const matchByName = existingCols.find(
                (c) => c.name.toLowerCase() === categoryData.name.toLowerCase()
              );
              const matchByDefault = existingCols.find(
                (c) => ["general", "default", "uncategorized"].includes(c.name.toLowerCase())
              );
              const matchedCol = matchByName || matchByDefault || existingCols[0];
              if (matchedCol) {
                finalCollectionId = matchedCol.id;
              }
            }
            
            if (!finalCollectionId) {
              const slug = categoryData.name
                .toLowerCase()
                .trim()
                .replace(/\s+/g, "-")
                .replace(/[^\w\-]+/g, "")
                .replace(/\-\-+/g, "-")
                .replace(/^-+/, "")
                .replace(/-+$/, "");
                
              const { data: newCol, error: newColErr } = await supabase
                .from("collections")
                .insert([
                  {
                    name: categoryData.name,
                    category_id: category_id,
                    slug,
                  }
                ])
                .select()
                .single();
                
              if (!newColErr && newCol) {
                finalCollectionId = newCol.id;
              }
            }
          }
        }

        // Update wallpapers table columns (e.g. collection_id)
        const updateData: any = {};
        if (finalCollectionId !== undefined) {
          updateData.collection_id = finalCollectionId;

          // Keep 'collection' text column in sync
          if (finalCollectionId === null) {
            updateData.collection = null;
          } else {
            const { data: colData } = await supabase
              .from("collections")
              .select("name")
              .eq("id", finalCollectionId)
              .single();
            if (colData) {
              updateData.collection = colData.name;
            }
          }
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateErr } = await supabase
            .from("wallpapers")
            .update(updateData)
            .eq("id", id);
          if (updateErr) {
            throw new Error(`Failed to update collection: ${updateErr.message}`);
          }
        }

        // Update tag relationships if tags array is provided
        if (tags !== undefined && Array.isArray(tags)) {
          // Clear current tags
          const { error: deleteErr } = await supabase
            .from("wallpaper_tags")
            .delete()
            .eq("wallpaper_id", id);
          if (deleteErr) {
            throw new Error(`Failed to clear existing tags: ${deleteErr.message}`);
          }

          // Insert new tags
          if (tags.length > 0) {
            const insertRows = tags.map((tagId: any) => ({
              wallpaper_id: id,
              tag_id: Number(tagId),
            }));

            const { error: insertErr } = await supabase
              .from("wallpaper_tags")
              .insert(insertRows);
            if (insertErr) {
              throw new Error(`Failed to insert new tags: ${insertErr.message}`);
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
