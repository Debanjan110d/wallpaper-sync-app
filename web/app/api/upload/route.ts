import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import crypto from "crypto";
import { imageSize } from "image-size";

type DbError = {
  message: string;
  code?: string;
};

function getHash(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

const MAX_BYTES = 20 * 1024 * 1024; // 20MB
const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;
const ASPECT_MIN = 0.5; // portrait allowed but not extreme
const ASPECT_MAX = 3.0;

function getSafeExt(filename: string) {
  const idx = filename.lastIndexOf(".");
  if (idx === -1) return "";
  const ext = filename.slice(idx).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp") return ext;
  return "";
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");

    if (!session || session.value !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const collectionRaw = formData.get("collection") || formData.get("username");
    const collection = typeof collectionRaw === "string" ? collectionRaw.trim() : null;

    const collectionIdRaw = formData.get("collection_id");
    const collectionId = collectionIdRaw ? Number(collectionIdRaw) : null;

    const tagsRaw = formData.get("tags");
    let tagIds: number[] = [];
    if (typeof tagsRaw === "string" && tagsRaw.trim()) {
      try {
        tagIds = JSON.parse(tagsRaw);
      } catch {
        tagIds = tagsRaw
          .split(",")
          .map((id) => Number(id.trim()))
          .filter(Number.isFinite);
      }
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY is missing in .env" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const finalCollectionId = collectionId;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${Math.round(MAX_BYTES / (1024 * 1024))}MB)` },
        { status: 413 }
      );
    }

    // Validate dimensions/aspect ratio
    const dimensions = imageSize(buffer);
    const width = dimensions.width || 0;
    const height = dimensions.height || 0;

    if (!width || !height) {
      return NextResponse.json({ error: "Could not read image dimensions" }, { status: 400 });
    }

    if (width < MIN_WIDTH || height < MIN_HEIGHT) {
      return NextResponse.json(
        { error: `Image too small (min ${MIN_WIDTH}x${MIN_HEIGHT})` },
        { status: 400 }
      );
    }

    const aspect = width / height;
    if (aspect < ASPECT_MIN || aspect > ASPECT_MAX) {
      return NextResponse.json(
        { error: `Invalid aspect ratio (${aspect.toFixed(2)}). Please upload a wallpaper-style image.` },
        { status: 400 }
      );
    }

    const hash = getHash(buffer);

    // Database-first duplicate prevention
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("wallpapers")
      .select("id, storage_path, hash")
      .eq("hash", hash)
      .limit(1)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(
        { error: "Duplicate image already exists", existing },
        { status: 409 }
      );
    }

    const ext = getSafeExt(file.name) || ".jpg";
    const storagePath = `${hash}${ext}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("wallpapers")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: row, error: insertError } = await supabaseAdmin
      .from("wallpapers")
      .insert([
        {
          file_name: file.name,
          storage_path: storagePath,
          hash,
        },
      ])
      .select("id, file_name, storage_path, hash, created_at")
      .single();

    const dbError = insertError as DbError | null;
    if (dbError) {
      // Best-effort cleanup
      try {
        await supabaseAdmin.storage.from("wallpapers").remove([storagePath]);
      } catch {
        // ignore cleanup errors
      }

      if (dbError.code === "23505") {
        return NextResponse.json(
          { error: "Duplicate image already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    if (row && Array.isArray(tagIds) && tagIds.length > 0) {
      const insertRows = tagIds.map((tagId) => ({
        wallpaper_id: row.id,
        tag_id: tagId,
      }));

      const { error: tagsErr } = await supabaseAdmin
        .from("wallpaper_tags")
        .insert(insertRows);

      if (tagsErr) {
        console.error("Failed to insert wallpaper tags:", tagsErr.message);
      }
    }

    if (row && finalCollectionId) {
      const { error: colLinkErr } = await supabaseAdmin
        .from("wallpaper_collections")
        .insert([{
          wallpaper_id: row.id,
          collection_id: finalCollectionId,
        }]);

      if (colLinkErr) {
        console.error("Failed to link wallpaper to collection on upload:", colLinkErr.message);
      }
    }

    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
    let url: string | null = null;
    if (cdnUrl) {
      const cleanCdn = cdnUrl.replace(/\/+$/, "");
      url = `${cleanCdn}/${storagePath}`;
    } else {
      const { data: urlData } = await supabaseAdmin.storage
        .from("wallpapers")
        .createSignedUrl(storagePath, 60 * 60);
      url = urlData?.signedUrl || null;
    }
    const version = row?.created_at ? new Date(row.created_at).getTime() : 0;
    const urlWithVersion = url ? `${url}?v=${version}` : null;

    return NextResponse.json({ 
      success: true, 
      data: { 
        upload: uploadData, 
        row: row ? {
          ...row,
          url: urlWithVersion
        } : null
      } 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}