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
    characters?: string[];
    franchises?: string[];
    tags?: string[];
    styles?: string[];
    moods?: string[];
    other_attributes?: string[];
    primary_color?: string | null;
    colors?: string[];
  },
  supabaseAdmin: any
) {
  try {
    // 1. Fetch all collections
    const { data: collections, error: colsErr } = await supabaseAdmin
      .from("collections")
      .select("id, name, slug");
    if (colsErr || !collections) {
      console.error("[Assign] Failed to fetch collections:", colsErr);
      return;
    }

    // 2. Fetch all keyword profiles (kewords column)
    const { data: keywords, error: kwErr } = await supabaseAdmin
      .from("collection_keywords")
      .select("collection_id, kewords, weight");
    if (kwErr || !keywords) {
      console.error("[Assign] Failed to fetch collection keywords:", kwErr);
      return;
    }

    // 3. Clear existing assignments
    await supabaseAdmin
      .from("wallpaper_collections")
      .delete()
      .eq("wallpaper_id", wallpaperId);

    // 4. Gather terms for scoring
    const wallpaperTerms = new Set<string>();

    if (metadata.tags) {
      metadata.tags.forEach(t => wallpaperTerms.add(t.toLowerCase().trim()));
    }
    if (metadata.characters) {
      metadata.characters.forEach(c => {
        const lower = c.toLowerCase().trim();
        wallpaperTerms.add(lower);
        lower.split(/\s+/).forEach(w => wallpaperTerms.add(w));
      });
    }
    if (metadata.franchises) {
      metadata.franchises.forEach(f => {
        const lower = f.toLowerCase().trim();
        wallpaperTerms.add(lower);
        lower.split(/\s+/).forEach(w => wallpaperTerms.add(w));
      });
    }
    if (metadata.styles) {
      metadata.styles.forEach(s => wallpaperTerms.add(s.toLowerCase().trim()));
    }
    if (metadata.moods) {
      metadata.moods.forEach(m => wallpaperTerms.add(m.toLowerCase().trim()));
    }
    if (metadata.other_attributes) {
      metadata.other_attributes.forEach(a => wallpaperTerms.add(a.toLowerCase().trim()));
    }
    if (metadata.colors) {
      metadata.colors.forEach(c => wallpaperTerms.add(c.toLowerCase().trim()));
    }
    if (metadata.primary_color) {
      wallpaperTerms.add(metadata.primary_color.toLowerCase().trim());
    }

    const cleanWord = (w: string) => w.toLowerCase().replace(/[^\w]/g, "");
    if (metadata.title) {
      metadata.title.split(/\s+/).map(cleanWord).filter(Boolean).forEach(w => wallpaperTerms.add(w));
    }
    if (metadata.description) {
      metadata.description.split(/\s+/).map(cleanWord).filter(Boolean).forEach(w => wallpaperTerms.add(w));
    }

    // 5. Score collections
    const assignments: any[] = [];
    for (const col of collections) {
      const colKeywords = keywords.filter((k: any) => k.collection_id === col.id);
      if (colKeywords.length === 0) continue;

      let score = 0;

      for (const kwEntry of colKeywords) {
        const kw = kwEntry.kewords.toLowerCase().trim();
        const weight = Number(kwEntry.weight) || 1.0;

        if (wallpaperTerms.has(kw)) {
          score += weight;
        } else {
          // Substring checks
          for (const term of wallpaperTerms) {
            if (term.includes(kw) || kw.includes(term)) {
              score += weight * 0.5;
              break;
            }
          }
        }
      }

      // Convert score to a scaled 0-100 percentage.
      // Match if score >= 0.8 (e.g. at least one solid keyword matched)
      // Percentage maps score 2.0+ to 100%, score 0.8 to 40%
      const percentage = Math.min(100, Math.round((score / 2.0) * 100));

      if (score >= 0.8) {
        assignments.push({
          wallpaper_id: wallpaperId,
          collection_id: col.id,
          match_score: percentage,
          assigned_by: "keyword_engine"
        });
      }
    }

    // 6. Save collection links in many-to-many junction
    if (assignments.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from("wallpaper_collections")
        .insert(assignments);

      if (insErr) {
        console.error(`[Assign] Failed to insert assignments for ${wallpaperId}:`, insErr);
      }
      // 7. Backward compatibility: removed (wallpapers.collection_id column is no longer present)
    }

    // 8. Recount counts for all collections
    await recountCollectionWallpapers(supabaseAdmin);
  } catch (err) {
    console.error(`[Assign] Error assigning collection to wallpaper ${wallpaperId}:`, err);
  }
}
