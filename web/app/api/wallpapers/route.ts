import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type DbWallpaper = {
  id: string;
  file_name: string | null;
  storage_path: string | null;
  hash: string | null;
  title?: string | null;
  description?: string | null;
  orientation?: string | null;
  quality?: string | null;
  created_at: string | null;
  wallpaper_tags: {
    tag_id: number;
    tags: {
      id: number;
      name: string;
    } | null;
  }[] | null;
  wallpaper_collections?: {
    collection_id: number;
    collections: {
      id: number;
      name: string;
    } | null;
  }[] | null;
};

function normalizeSearchQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[\-_\s]+/g, " ")
    .trim()
    .split(" ")
    .filter((w, i, arr) => w.length > 0 && arr.indexOf(w) === i);
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

    // Extract pagination parameters
    const limitParam = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor") || null;
    const defaultLimit = isValidSyncToken ? 100000 : 30;
    const limit = limitParam ? parseInt(limitParam, 10) : defaultLimit;

    // Extract filters
    const collectionId = url.searchParams.get("collection");
    const tagIds = url.searchParams.get("tags");
    const q = url.searchParams.get("q");

    let filteredWpIds: string[] | null = null;
    let noMatch = false;

    if (collectionId && !noMatch) {
      const { data: wcLinks, error: wcErr } = await supabase
        .from("wallpaper_collections")
        .select("wallpaper_id")
        .eq("collection_id", Number(collectionId));

      if (wcErr) {
        return NextResponse.json({ error: wcErr.message }, { status: 500 });
      }

      const matchedIds = (wcLinks || []).map((l) => l.wallpaper_id);

      if (filteredWpIds === null) {
        filteredWpIds = matchedIds;
      } else {
        const currentIds: string[] = filteredWpIds;
        filteredWpIds = currentIds.filter((id) => matchedIds.includes(id));
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
          const currentIds: string[] = filteredWpIds;
          filteredWpIds = currentIds.filter((id) => tagWpIds.includes(id));
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

    // Retrieve wallpapers based on schema-conforming fields
    let query: any = supabase
      .from("wallpapers")
      .select(`
        id,
        file_name,
        storage_path,
        hash,
        title,
        description,
        orientation,
        quality,
        created_at,
        wallpaper_tags (
          tag_id,
          tags (
            id,
            name
          )
        ),
        wallpaper_collections (
          collection_id,
          collections (
            id,
            name
          )
        )
      `)
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

    let filteredRows = (rows as unknown as DbWallpaper[]) || [];

    // Apply search keyword matching
    if (q && q.trim()) {
      const searchTerms = normalizeSearchQuery(q);
      if (searchTerms.length > 0) {
        filteredRows = filteredRows.filter((row) => {
          const searchableTexts: string[] = [];
          if (row.title) searchableTexts.push(row.title);
          if (row.description) searchableTexts.push(row.description);
          if (row.file_name) searchableTexts.push(row.file_name);
          
          if (row.wallpaper_tags) {
            row.wallpaper_tags.forEach((wt: any) => {
              if (wt.tags?.name) searchableTexts.push(wt.tags.name);
            });
          }
          if (row.wallpaper_collections) {
            row.wallpaper_collections.forEach((wc: any) => {
              if (wc.collections?.name) searchableTexts.push(wc.collections.name);
            });
          }

          const unifiedText = searchableTexts.join(" ").toLowerCase();
          return searchTerms.every(term => unifiedText.includes(term));
        });
      }
    }

    if (countOnly) {
      const maxCreatedAt = filteredRows.length > 0 ? filteredRows[0].created_at : null;
      return NextResponse.json({
        wallpapers: [],
        count: filteredRows.length,
        max_created_at: maxCreatedAt,
        since: hasValidSince ? since!.toISOString() : null,
      });
    }

    const totalCount = filteredRows.length;

    // ETag caching check
    const maxCreatedAt = filteredRows.length > 0 ? filteredRows[0].created_at : "empty";
    
    const editTracker = filteredRows
      .map(
        (r) =>
          `${r.id}-${r.title || ""}-${(r.wallpaper_tags || []).map((wt: any) => wt.tag_id).sort().join(",")}-${(r.wallpaper_collections || []).map((wc: any) => wc.collection_id).sort().join(",")}`
      )
      .join("|");
    
    let hashVal = 0;
    for (let i = 0; i < editTracker.length; i++) {
      hashVal = (hashVal << 5) - hashVal + editTracker.charCodeAt(i);
      hashVal |= 0;
    }

    const etag = `W/"${maxCreatedAt}-${totalCount}-${hashVal}-${cursor || "none"}"`;

    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          "Cache-Control": "no-cache",
          "ETag": etag,
          "Vary": "Cookie, x-sync-token",
        },
      });
    }

    let paginatedRows = filteredRows;
    let nextCursor: string | null = null;
    let hasMore = false;

    if (cursor) {
      const cursorIndex = filteredRows.findIndex((r) => r.created_at === cursor);
      if (cursorIndex !== -1) {
        paginatedRows = filteredRows.slice(cursorIndex + 1);
      }
    }

    if (paginatedRows.length > limit) {
      hasMore = true;
      nextCursor = paginatedRows[limit - 1].created_at || null;
      paginatedRows = paginatedRows.slice(0, limit);
    }

    const wallpapers = await Promise.all(
      paginatedRows
        .filter((row) => !!row.storage_path)
        .map(async (row) => {
          const storagePath = String(row.storage_path);
          const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;

          let url: string | null = null;

          if (cdnUrl) {
            const cleanCdn = cdnUrl.replace(/\/+$/, "");
            url = `${cleanCdn}/${storagePath}`;
          } else {
            // Fallback to generating standard signed URLs
            const { data: urlData, error: urlError } = await supabase.storage
              .from("wallpapers")
              .createSignedUrl(storagePath, 60 * 60);
            url = urlError ? null : (urlData?.signedUrl || null);
          }

          const wc = Array.isArray(row.wallpaper_collections) && row.wallpaper_collections.length > 0
            ? row.wallpaper_collections[0]
            : null;

          const collectionDetails = wc && wc.collections
            ? {
                id: wc.collections.id,
                name: wc.collections.name,
              }
            : null;

          const tags = Array.isArray(row.wallpaper_tags)
            ? row.wallpaper_tags
                .map((wt) => wt.tags)
                .filter((t): t is { id: number; name: string } => !!t)
            : [];

          const multiCollections = Array.isArray(row.wallpaper_collections)
            ? row.wallpaper_collections
                .map((wc) => wc.collections)
                .filter((c): c is { id: number; name: string } => !!c)
            : [];

          // Version hash based on created_at to break caches when item updates
          const version = row.created_at ? new Date(row.created_at).getTime() : 0;
          const urlWithVersion = url ? `${url}?v=${version}` : null;

          return {
            id: row.id,
            file_name: row.file_name,
            storage_path: storagePath,
            hash: row.hash,
            collection: wc?.collections?.name || null,
            created_at: row.created_at,
            collection_id: wc?.collections?.id || null,
            collection_details: collectionDetails,
            tags,
            collections: multiCollections,
            title: row.title || null,
            description: row.description || null,
            orientation: row.orientation || null,
            quality: row.quality || null,
            name: storagePath.split("/").pop() || storagePath,
            url: urlWithVersion,
          };
        })
    );

    const finalMaxCreatedAt = filteredRows.length > 0 ? filteredRows[0].created_at : null;

    return NextResponse.json(
      {
        wallpapers,
        max_created_at: finalMaxCreatedAt,
        count: totalCount,
        nextCursor,
        hasMore,
        since: hasValidSince ? since!.toISOString() : null,
      },
      {
        headers: {
          "Cache-Control": "no-cache",
          "ETag": etag,
          "Vary": "Cookie, x-sync-token",
        },
      }
    );
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
      await supabaseAdmin
        .from("wallpaper_tags")
        .delete()
        .eq("wallpaper_id", rowIdToUpdate);

      await supabaseAdmin
        .from("wallpaper_collections")
        .delete()
        .eq("wallpaper_id", rowIdToUpdate);

      const { error: dbDeleteErr } = await supabaseAdmin
        .from("wallpapers")
        .delete()
        .eq("id", rowIdToUpdate);
      if (dbDeleteErr) {
        return NextResponse.json({ error: dbDeleteErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
