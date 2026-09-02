import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { queryTextAI } from "./openrouter";

// Helper to slugify tags
export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

// Clean response from Gemini/LLM in case it wraps it in markdown blocks.
// Regex is our friend here because LLMs love to throw random newlines and formatting at us.
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  // Strip opening markdown tags e.g. ```json or ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  // Strip closing markdown tags e.g. ```
  cleaned = cleaned.replace(/\s*```$/, "");
  return cleaned.trim();
}

// Who needs double-cleaning anyway? Actually, we do, because LLMs are like toddlers who ignore rules.
// This function scrubs away generic trash like "wallpaper", "4k", etc., and ensures tags don't overlap.
export function cleanAndNormalizeTagsLocal(tags: any): string[] {
  if (!tags) return [];
  const rawTags = Array.isArray(tags) ? tags : String(tags).split(",");
  
  const excludedWords = new Set([
    "wallpaper", "wallpapers", "image", "images", "photo", "photos", 
    "picture", "pictures", "desktop", "background", "backgrounds", 
    "art", "illustration", "vector", "drawing", "pic", "pics", 
    "hd", "4k", "screen", "screensaver"
  ]);

  const seenSlugs = new Set<string>();
  const cleaned: string[] = [];

  for (const tag of rawTags) {
    if (!tag) continue;
    const trimmed = String(tag).trim().toLowerCase();
    if (!trimmed || excludedWords.has(trimmed)) continue;

    // Generate slug to detect near-duplicates (e.g., "spider-man" vs "spiderman")
    const slug = slugify(trimmed);
    if (!slug || seenSlugs.has(slug)) continue;

    seenSlugs.add(slug);
    cleaned.push(trimmed);
  }

  return cleaned;
}

interface RawVisionMetadata {
  title: string;
  description: string;
  characters: string[];
  franchises: string[];
  tags: string[];
  colors: string[];
  style: string[];
  mood: string[];
  other_attributes: string[];
  confidence: number;
}

export async function processWallpaperAI(
  wallpaperId: string,
  imageBuffer: Buffer,
  mimeType: string,
  provider?: "gemini" | "imagga"
): Promise<{ success: boolean; error?: string }> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log(`[AI Processor] Direct indexing (manual mode) for wallpaper ID ${wallpaperId}...`);
    const { error: updateErr } = await supabaseAdmin
      .from("wallpapers")
      .update({
        status: "indexed",
        indexed_at: new Date().toISOString()
      })
      .eq("id", wallpaperId);

    if (updateErr) {
      throw new Error(`Failed to update wallpaper: ${updateErr.message}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error(`Error indexing wallpaper ${wallpaperId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Recounts the number of wallpapers assigned to each collection.
 * It also washes away empty collections because empty spaces are only cool in minimalist design,
 * not in our database.
 */
export async function recountCollectionWallpapers(supabaseAdmin: any) {
  try {
    const { data: counts, error: countErr } = await supabaseAdmin
      .from("wallpaper_collections")
      .select("collection_id");

    if (countErr || !counts) return;

    const activeCollectionIds = new Set(counts.map((row: any) => row.collection_id));
    const { data: collections } = await supabaseAdmin.from("collections").select("id");
    if (!collections) return;

    for (const col of collections) {
      if (!activeCollectionIds.has(col.id)) {
        // Delete empty collection
        await supabaseAdmin
          .from("collections")
          .delete()
          .eq("id", col.id);
      }
    }
  } catch (e) {
    console.error("Cleaning empty collections failed:", e);
  }
}

/**
 * Evaluates a wallpaper against all discovered collection keyword profiles
 * and stores matches in the wallpaper_collections table.
 */
export async function assignWallpaperToCollections(
  wallpaperId: string,
  metadata: {
    title?: string | null;
    description?: string | null;
    tags?: string[];
  },
  supabaseAdmin: any
) {
  try {
    const { data: collections, error: colsErr } = await supabaseAdmin
      .from("collections")
      .select("id, name, slug");
    if (colsErr || !collections) return;

    const wallpaperTerms = new Set<string>();

    if (metadata.tags) {
      metadata.tags.forEach(t => wallpaperTerms.add(t.toLowerCase().trim()));
    }

    const cleanWord = (w: string) => w.toLowerCase().replace(/[^\w]/g, "");
    if (metadata.title) {
      metadata.title.split(/\s+/).map(cleanWord).filter(Boolean).forEach(w => wallpaperTerms.add(w));
    }
    if (metadata.description) {
      metadata.description.split(/\s+/).map(cleanWord).filter(Boolean).forEach(w => wallpaperTerms.add(w));
    }

    const assignments: any[] = [];
    for (const col of collections) {
      const colName = col.name.toLowerCase().trim();
      if (wallpaperTerms.has(colName) || Array.from(wallpaperTerms).some(t => t.length > 2 && (t.includes(colName) || colName.includes(t)))) {
        assignments.push({
          wallpaper_id: wallpaperId,
          collection_id: col.id,
        });
      }
    }

    if (assignments.length > 0) {
      await supabaseAdmin
        .from("wallpaper_collections")
        .upsert(assignments, { onConflict: "wallpaper_id,collection_id" });
    }
  } catch (err) {
    console.error(`[Assign] Error assigning collection to wallpaper ${wallpaperId}:`, err);
  }
}


