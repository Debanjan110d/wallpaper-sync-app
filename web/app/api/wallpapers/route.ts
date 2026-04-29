import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { cookies } from "next/headers";

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

    // List all files in the "wallpapers" bucket
    const { data, error } = await supabase.storage.from("wallpapers").list();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate signed URLs for all files (valid for 1 hour)
    const wallpapers = await Promise.all(
      data
        .filter((file) => file.name !== ".emptyFolderPlaceholder")
        .map(async (file) => {
          const { data: urlData } = await supabase.storage
            .from("wallpapers")
            .createSignedUrl(file.name, 60 * 60);
            
          return {
            name: file.name,
            url: urlData?.signedUrl || null,
            created_at: file.created_at,
          };
        })
    );

    return NextResponse.json({ wallpapers });
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

    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: "No filename provided" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin.storage
      .from("wallpapers")
      .remove([filename]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
