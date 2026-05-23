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

    // If SYNC_TOKEN is configured, require either a valid token or an admin session.
    // If SYNC_TOKEN is NOT configured, allow public reads (useful for local dev).
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

    // Database-first: list verified wallpaper records and then resolve Storage URLs.
    const url = new URL(request.url);
    const sinceParam = (url.searchParams.get("since") || "").trim();
    const countOnly = (url.searchParams.get("countOnly") || "").trim() === "1";
    const since = sinceParam ? new Date(sinceParam) : null;
    const hasValidSince = !!since && !Number.isNaN(since.getTime());

    // Low-resource mode: only return count + newest created_at (no signed URLs).
    if (countOnly) {
      let countQuery = supabase
        .from("wallpapers")
        .select("created_at", { count: "exact", head: true })
        .neq("status", "deleted");

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
      .select("id, file_name, storage_path, hash, status, collection, created_at")
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    if (hasValidSince) {
      query = query.gt("created_at", since!.toISOString());
    }

    const { data: rows, error: dbError } = await query;

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const wallpapers = await Promise.all(
      (rows as DbWallpaper[])
        .filter((row) => !!row.storage_path)
        .map(async (row) => {
          const storagePath = String(row.storage_path);
          const { data: urlData, error: urlError } = await supabase.storage
            .from("wallpapers")
            .createSignedUrl(storagePath, 60 * 60);

          return {
            id: row.id,
            file_name: row.file_name,
            storage_path: storagePath,
            hash: row.hash,
            status: row.status,
            collection: row.collection,
            created_at: row.created_at,
            // Back-compat for existing clients (Electron/downloader + dashboard UI)
            name: storagePath.split("/").pop() || storagePath,
            url: urlError ? null : (urlData?.signedUrl || null),
          };
        })
    );

    const maxCreatedAt = (rows && rows.length > 0) ? (rows[0] as DbWallpaper).created_at : null;

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
