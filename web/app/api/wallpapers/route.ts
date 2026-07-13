import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type DbWallpaper = {
  id: string;
  file_name: string | null;
  storage_path: string | null;
  hash: string | null;
  status: string | null;
  collection: string | null;
  created_at: string | null;
  collection_id: number | null;
  collections: {
    id: number;
    name: string;
    category_id: number | null;
    categories: {
      id: number;
      name: string;
    } | null;
  } | null;
  wallpaper_tags: {
    tag_id: number;
    tags: {
      id: number;
      name: string;
    } | null;
  }[] | null;
};

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");

    const syncToken = (process.env.SYNC_TOKEN || "").trim();
    const requestToken = (request.headers.get("x-sync-token") || "").trim();

    const isAdminSession = !!session && session.value === "true";
    const isSyncTokenConfigured = syncToken.length > 0;
    const isValidSyncToken = isSyncTokenConfigured && requestToken === syncToken;

    if (!isAdminSession && isSyncTokenConfigured && !isValidSyncToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const url = new URL(request.url);
    const sinceParam = (url.searchParams.get("since") || "").trim();
    const countOnly = (url.searchParams.get("countOnly") || "").trim() === "1";
    const since = sinceParam ? new Date(sinceParam) : null;
    const hasValidSince = !!since && !Number.isNaN(since.getTime());

    // Extract filters
    const categoryId = url.searchParams.get("category");
    const collectionId = url.searchParams.get("collection");
    const tagIds = url.searchParams.get("tags");

    // Gather matched wallpaper IDs first if filters are specified
    let filteredWpIds: string[] | null = null;
    let noMatch = false;

    if (categoryId) {
      const { data: cols, error: colsErr } = await supabase
        .from("collections")
        .select("id")
        .eq("category_id", Number(categoryId));

      if (colsErr) {
        return NextResponse.json({ error: colsErr.message }, { status: 500 });
      }

      const colIds = (cols || []).map((c) => c.id);
      if (colIds.length === 0) {
        noMatch = true;
      } else {
        const { data: wps, error: wpsErr } = await supabase
          .from("wallpapers")
          .select("id")
          .in("collection_id", colIds);

        if (wpsErr) {
          return NextResponse.json({ error: wpsErr.message }, { status: 500 });
        }

        filteredWpIds = (wps || []).map((w) => w.id);
      }
    }

    if (collectionId && !noMatch) {
      const { data: wps, error: wpsErr } = await supabase
        .from("wallpapers")
        .select("id")
        .eq("collection_id", Number(collectionId));

      if (wpsErr) {
        return NextResponse.json({ error: wpsErr.message }, { status: 500 });
      }

      const colWpIds = (wps || []).map((w) => w.id);
      if (filteredWpIds === null) {
        filteredWpIds = colWpIds;
      } else {
        filteredWpIds = filteredWpIds.filter((id) => colWpIds.includes(id));
      }
      if (filteredWpIds.length === 0) {
        noMatch = true;
      }
    }

    if (tagIds && !noMatch) {
      const idsArr = tagIds
        .split(",")
        .map((id) => Number(id.trim()))
        .filter(Number.isFinite);

      if (idsArr.length > 0) {
        const { data: wpTags, error: wpTagsErr } = await supabase
          .from("wallpaper_tags")
          .select("wallpaper_id")
          .in("tag_id", idsArr);

        if (wpTagsErr) {
          return NextResponse.json({ error: wpTagsErr.message }, { status: 500 });
        }

        const tagWpIds = (wpTags || []).map((wt) => wt.wallpaper_id);
        if (filteredWpIds === null) {
          filteredWpIds = tagWpIds;
        } else {
          filteredWpIds = filteredWpIds.filter((id) => tagWpIds.includes(id));
        }
        if (filteredWpIds.length === 0) {
          noMatch = true;
        }
      }
    }

    if (noMatch) {
      return NextResponse.json({
        wallpapers: [],
        count: 0,
        max_created_at: null,
        since: hasValidSince ? since!.toISOString() : null,
      });
    }

    // Low-resource mode: only return count + newest created_at (no signed URLs).
    if (countOnly) {
      let countQuery = supabase
        .from("wallpapers")
        .select("created_at", { count: "exact", head: true })
        .neq("status", "deleted");

      if (filteredWpIds !== null) {
        countQuery = countQuery.in("id", filteredWpIds);
      }

      if (hasValidSince) {
        countQuery = countQuery.gt("created_at", since!.toISOString());
      }

      const { count, error: countErr } = await countQuery;
      if (countErr) {
        return NextResponse.json({ error: countErr.message }, { status: 500 });
      }

      let maxQuery = supabase
        .from("wallpapers")
        .select("created_at")
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
        .limit(1);

      if (filteredWpIds !== null) {
        maxQuery = maxQuery.in("id", filteredWpIds);
      }

      if (hasValidSince) {
        maxQuery = maxQuery.gt("created_at", since!.toISOString());
      }

      const { data: maxRow, error: maxErr } = await maxQuery.maybeSingle();
      if (maxErr) {
        return NextResponse.json({ error: maxErr.message }, { status: 500 });
      }

      return NextResponse.json({
        wallpapers: [],
        count: count || 0,
        max_created_at: maxRow?.created_at || null,
        since: hasValidSince ? since!.toISOString() : null,
      });
    }

    let query = supabase
      .from("wallpapers")
      .select(`
        id,
        file_name,
        storage_path,
        hash,
        status,
        collection,
        created_at,
        collection_id,
        collections (
          id,
          name,
          category_id,
          categories (
            id,
            name
          )
        ),
        wallpaper_tags (
          tag_id,
          tags (
            id,
            name
          )
        )
      `)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    if (filteredWpIds !== null) {
      query = query.in("id", filteredWpIds);
    }

    if (hasValidSince) {
      query = query.gt("created_at", since!.toISOString());
    }

    const { data: rows, error: dbError } = await query;

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const wallpapers = await Promise.all(
      (rows as unknown as DbWallpaper[])
        .filter((row) => !!row.storage_path)
        .map(async (row) => {
          const storagePath = String(row.storage_path);
          const { data: urlData, error: urlError } = await supabase.storage
            .from("wallpapers")
            .createSignedUrl(storagePath, 60 * 60);

          // Format nested collections structure
          const collectionDetails = row.collections
            ? {
                id: row.collections.id,
                name: row.collections.name,
                category_id: row.collections.category_id,
                category_name: row.collections.categories
                  ? row.collections.categories.name
                  : null,
              }
            : null;

          // Format nested tags structure
          const tags = Array.isArray(row.wallpaper_tags)
            ? row.wallpaper_tags
                .map((wt) => wt.tags)
                .filter((t): t is { id: number; name: string } => !!t)
            : [];

          return {
            id: row.id,
            file_name: row.file_name,
            storage_path: storagePath,
            hash: row.hash,
            status: row.status,
            collection: row.collection,
            created_at: row.created_at,
            collection_id: row.collection_id,
            collection_details: collectionDetails,
            tags: tags,
            // Back-compat for existing clients (Electron/downloader + dashboard UI)
            name: storagePath.split("/").pop() || storagePath,
            url: urlError ? null : (urlData?.signedUrl || null),
          };
        })
    );

    const maxCreatedAt =
      rows && rows.length > 0 ? (rows[0] as unknown as DbWallpaper).created_at : null;

    return NextResponse.json({
      wallpapers,
      max_created_at: maxCreatedAt,
      count: wallpapers.length,
      since: hasValidSince ? since!.toISOString() : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");

    if (!session || session.value !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, filename, storage_path } = await request.json();

    if (!id && !filename && !storage_path) {
      return NextResponse.json({ error: "No identifier provided" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let storagePathToDelete: string | null = null;
    let rowIdToUpdate: string | null = null;

    if (id) {
      rowIdToUpdate = String(id);
      const { data: row, error: rowErr } = await supabaseAdmin
        .from("wallpapers")
        .select("id, storage_path")
        .eq("id", rowIdToUpdate)
        .maybeSingle();
      if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 });
      storagePathToDelete = row?.storage_path ? String(row.storage_path) : null;
    } else {
      storagePathToDelete = String(storage_path || filename);
      const { data: row, error: rowErr } = await supabaseAdmin
        .from("wallpapers")
        .select("id")
        .eq("storage_path", storagePathToDelete)
        .maybeSingle();
      if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 });
      rowIdToUpdate = row?.id ? String(row.id) : null;
    }

    if (!storagePathToDelete) {
      return NextResponse.json({ error: "Wallpaper not found" }, { status: 404 });
    }

    const { error: storageErr } = await supabaseAdmin.storage
      .from("wallpapers")
      .remove([storagePathToDelete]);

    if (storageErr) {
      return NextResponse.json({ error: storageErr.message }, { status: 500 });
    }

    if (rowIdToUpdate) {
      const { error: updateErr } = await supabaseAdmin
        .from("wallpapers")
        .update({ status: "deleted" })
        .eq("id", rowIdToUpdate);
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

