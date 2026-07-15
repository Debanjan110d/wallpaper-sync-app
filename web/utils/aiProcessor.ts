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
    // Fetch wallpaper details for status and filename context
    const { data: wpData, error: wpErr } = await supabaseAdmin
      .from("wallpapers")
      .select("status, file_name")
      .eq("id", wallpaperId)
      .single();

    if (wpErr || !wpData) {
      console.warn(`[AI Processor] Wallpaper ID ${wallpaperId} not found in DB.`);
      return { success: false, error: "Wallpaper not found" };
    }

    // Prevent concurrent repetitive runs by skipping if already processing
    if (wpData.status === "pending_ai") {
      console.log(`[AI Processor] Skipping wallpaper ID ${wallpaperId} because it is already actively processing.`);
      return { success: true };
    }

    // 1. Update status to 'pending_ai'
    await supabaseAdmin
      .from("wallpapers")
      .update({ status: "pending_ai" })
      .eq("id", wallpaperId);

    const filename = wpData?.file_name || "wallpaper.jpg";

    let activeProvider = provider || (process.env.VISION_PROVIDER as "gemini" | "imagga") || "imagga";
    let normalizedMetadata: RawVisionMetadata | null = null;

    if (activeProvider === "gemini") {
      try {
        console.log(`[AI Processor] Attempting to process wallpaper ID ${wallpaperId} using Gemini AI...`);
        // 2. Initialize Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY is not defined in environment variables");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Gemini 2.0 Flash is our savior. We force it to output pure JSON so we don't have to write
        // recursive markdown parsers that will keep us awake at 3 AM.
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          generationConfig: { responseMimeType: "application/json" }
        });

        // 3. Construct Vision Prompt
        const visionPrompt = `You are an expert wallpaper describer. Analyze the image and extract the following descriptors:
1. title: A short, high-quality descriptive title for the image.
2. description: A clear one-sentence description of the image content.
3. characters: Names of any specific characters (anime, gaming, pop culture) visible in the image. Return empty array if none.
4. franchises: Names of the franchise(s) or universes the image belongs to (e.g. "Naruto", "Marvel", "Cyberpunk", "Spider-Man").
5. tags: A list of 5 to 15 descriptive keywords capturing subjects, environment, mood, and visual elements.
6. colors: The dominant color families (e.g. "Blue", "Black", "Red", "Neon Pink").
7. style: Visual style tags, e.g. "Anime", "Digital Art", "Pixel Art", "Realistic", "3D Render", "Illustration".
8. mood: Emotional tone, e.g. "Dramatic", "Calm", "Mysterious", "Energetic", "Vibrant".
9. other_attributes: Misc tags (e.g. "Silhouette", "Minimal", "Detailed", "Glowing").
10. confidence: A score from 0.0 to 1.0 representing your confidence in this analysis.

Return ONLY a valid JSON object matching the following schema. Do NOT output markdown blocks or comments.
{
  "title": "string",
  "description": "string",
  "characters": ["string"],
  "franchises": ["string"],
  "tags": ["string"],
  "colors": ["string"],
  "style": ["string"],
  "mood": ["string"],
  "other_attributes": ["string"],
  "confidence": number
}`;

        const imagePart = {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType,
          },
        };

        // 4. Call Vision AI
        console.log(`[AI Processor] Calling Vision AI for ${wallpaperId}...`);
        const visionResult = await model.generateContent([visionPrompt, imagePart]);
        const visionText = visionResult.response.text();
        const cleanVisionJson = cleanJsonResponse(visionText);

        let visionMetadata: RawVisionMetadata;
        try {
          visionMetadata = JSON.parse(cleanVisionJson);
        } catch (e: any) {
          throw new Error(`Failed to parse Vision AI JSON: ${e.message}. Content was: ${visionText}`);
        }

        // 5. Call Gemma-4 via OpenRouter for Phase 2 Normalization
        // OpenRouter can be a bit temperamental or rate-limited on the free tier.
        // If it throws a tantrum, we catch it and use the raw Gemini vision metadata as a fallback
        // rather than crashing the whole indexing pipeline. Work smart, not hard.
        try {
          console.log(`[AI Processor] Calling Gemma-4 via OpenRouter to normalize metadata...`);
          const systemPrompt = `You are a metadata normalization AI. Your job is to clean, deduplicate, and normalize the metadata extracted from a wallpaper.
Follow these rules strictly:
1. Deduplicate tags, characters, franchises, colors, style, mood, and other_attributes (case-insensitive).
2. Clean tags: convert all tags to lowercase. Normalize spelling (e.g., "Naruto", "naruto", "NARUTO" -> "naruto"). Merge similar or identical words (e.g. "rainy", "rain" -> "rain"; "spiderman", "spider-man" -> "spider-man").
3. Strip meaningless tags (e.g., "wallpaper", "background", "image", "pic", "desktop").
4. Ensure characters and franchises are cleanly capitalized (e.g., "naruto uzumaki" -> "Naruto Uzumaki", "marvel" -> "Marvel").
5. Return the exact same JSON format with cleaned, deduplicated, and normalized values.
6. Do NOT invent new information. Only clean and normalize the provided input.`;

          const userPrompt = JSON.stringify(visionMetadata, null, 2);
          const normalizedText = await queryTextAI(systemPrompt, userPrompt);
          const cleanNormalizedJson = cleanJsonResponse(normalizedText);
          normalizedMetadata = JSON.parse(cleanNormalizedJson);
        } catch (e: any) {
          console.warn("[AI Processor] OpenRouter normalization failed, falling back to raw Vision AI output:", e.message || e);
          normalizedMetadata = visionMetadata;
        }
      } catch (geminiError: any) {
        console.warn(`[AI Processor] Gemini processing failed: ${geminiError.message || geminiError}. Falling back to Imagga...`);
        activeProvider = "imagga";
      }
    }

    if (activeProvider === "imagga") {
      console.log(`[AI Processor] Processing wallpaper ID ${wallpaperId} using Imagga API...`);

      const imaggaKey = process.env.IMAGGA_API_KEY;
      const imaggaSecret = process.env.IMAGGA_API_SECRET;
      if (!imaggaKey || !imaggaSecret) {
        throw new Error("IMAGGA_API_KEY or IMAGGA_API_SECRET is not defined in environment variables");
      }

      const auth = Buffer.from(`${imaggaKey}:${imaggaSecret}`).toString("base64");
      const authHeader = `Basic ${auth}`;

      // A. Upload image to Imagga v2
      const formData = new FormData();
      const uint8Array = new Uint8Array(imageBuffer);
      const blob = new Blob([uint8Array], { type: mimeType });
      formData.append("image", blob, filename);

      const uploadRes = await fetch("https://api.imagga.com/v2/uploads", {
        method: "POST",
        headers: {
          Authorization: authHeader,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Imagga upload failed: ${uploadRes.statusText}. Response: ${errorText}`);
      }

      const uploadData = await uploadRes.json();
      const uploadId = uploadData.result?.upload_id;
      if (!uploadId) {
        throw new Error("Imagga upload response did not return an upload_id");
      }

      // B. Fetch tags from Imagga
      const tagsRes = await fetch(`https://api.imagga.com/v2/tags?image_upload_id=${uploadId}`, {
        headers: { Authorization: authHeader },
      });
      if (!tagsRes.ok) {
        throw new Error(`Failed to fetch tags from Imagga: ${tagsRes.statusText}`);
      }
      const tagsData = await tagsRes.json();
      const imaggaTags = (tagsData.result?.tags || [])
        .slice(0, 15)
        .map((t: any) => `${t.tag.en} (${Math.round(t.confidence)}%)`);

      // C. Fetch colors from Imagga
      const colorsRes = await fetch(`https://api.imagga.com/v2/colors?image_upload_id=${uploadId}`, {
        headers: { Authorization: authHeader },
      });
      if (!colorsRes.ok) {
        throw new Error(`Failed to fetch colors from Imagga: ${colorsRes.statusText}`);
      }
      const colorsData = await colorsRes.json();
      const imageColors = colorsData.result?.colors?.image_colors || [];
      const imaggaColors = imageColors
        .slice(0, 5)
        .map((c: any) => `${c.closest_palette_color} (${Math.round(c.percent)}%)`);

      // D. Synthesize full metadata via OpenRouter (Gemma Model)
      console.log(`[AI Processor] Calling OpenRouter to synthesize metadata from Imagga tags/colors...`);
      const systemPrompt = `You are an expert wallpaper describer and metadata normalization AI.
You are given a filename, a list of visual tags (with confidence percentages), and a list of colors (with percentage coverage) extracted from an image.
Your job is to generate a rich, clean, schema-conforming JSON metadata structure.

Follow these rules:
1. title: Generate a short, creative, high-quality title (use the filename and tags for context).
2. description: Write a clear, engaging one-sentence description of the image.
3. characters: Extract names of any specific pop culture, anime, or gaming characters visible/implied. Return empty array if none.
4. franchises: Extract names of the franchise(s) or universes (e.g. "Marvel", "Dragon Ball", "Cyberpunk"). Return empty array if none.
5. tags: A list of 5 to 15 normalized, lowercase keywords capturing subjects, environment, mood, and style.
6. colors: The dominant color families (e.g. "Blue", "Black", "Orange").
7. style: Visual style tags, e.g. "Anime", "Vector", "Digital Art", "Minimalist", "3D Render".
8. mood: Emotional tone, e.g. "Calm", "Mysterious", "Vibrant", "Dark".
9. other_attributes: Misc tags (e.g. "Silhouette", "Glowing", "Detailed").
10. confidence: A score from 0.0 to 1.0 representing your confidence in this analysis.

Return ONLY a valid JSON object matching the following schema. Do NOT wrap in markdown blocks, do NOT output comments or extra text.

{
  "title": "string",
  "description": "string",
  "characters": ["string"],
  "franchises": ["string"],
  "tags": ["string"],
  "colors": ["string"],
  "style": ["string"],
  "mood": ["string"],
  "other_attributes": ["string"],
  "confidence": number
}`;

      const userPrompt = JSON.stringify({
        filename,
        imagga_tags: imaggaTags,
        imagga_colors: imaggaColors
      }, null, 2);

      const openRouterText = await queryTextAI(systemPrompt, userPrompt);
      const cleanOpenRouterJson = cleanJsonResponse(openRouterText);

      try {
        normalizedMetadata = JSON.parse(cleanOpenRouterJson);
      } catch (e: any) {
        throw new Error(`Failed to parse OpenRouter synthesized JSON: ${e.message}. Content was: ${openRouterText}`);
      }
    }

    if (!normalizedMetadata) {
      throw new Error("AI analysis did not yield any metadata results.");
    }

    // 6. Update Wallpaper Table with rich metadata fields
    const updatePayload = {
      title: normalizedMetadata.title || null,
      description: normalizedMetadata.description || null,
      characters: Array.isArray(normalizedMetadata.characters) ? normalizedMetadata.characters : [],
      franchises: Array.isArray(normalizedMetadata.franchises) ? normalizedMetadata.franchises : [],
      styles: Array.isArray(normalizedMetadata.style) ? normalizedMetadata.style : [],
      moods: Array.isArray(normalizedMetadata.mood) ? normalizedMetadata.mood : [],
      other_attributes: Array.isArray(normalizedMetadata.other_attributes) ? normalizedMetadata.other_attributes : [],
      confidence: typeof normalizedMetadata.confidence === "number" ? normalizedMetadata.confidence : 1.0,
      indexed_at: new Date().toISOString(),
      status: "indexed" // Moderation queue
    };

    console.log(`[AI Processor] Updating DB record for ${wallpaperId}...`);
    const { error: updateErr } = await supabaseAdmin
      .from("wallpapers")
      .update(updatePayload)
      .eq("id", wallpaperId);

    if (updateErr) {
      throw new Error(`Failed to update wallpaper: ${updateErr.message}`);
    }

    // 7. Process & Link Tags - Clean and deduplicate tags locally as a fail-safe
    const filteredTags = cleanAndNormalizeTagsLocal(normalizedMetadata.tags);

    // Clear existing tags to prevent duplicates during re-runs
    await supabaseAdmin
      .from("wallpaper_tags")
      .delete()
      .eq("wallpaper_id", wallpaperId);

    for (const tagName of filteredTags) {
      const tagSlug = slugify(tagName);
      if (!tagSlug) continue;

      let tagId: number | null = null;

      // Find or insert tag
      const { data: existingTag } = await supabaseAdmin
        .from("tags")
        .select("id")
        .eq("slug", tagSlug)
        .maybeSingle();

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        const { data: newTag, error: tagInsertErr } = await supabaseAdmin
          .from("tags")
          .insert([{ name: tagName, slug: tagSlug }])
          .select("id")
          .maybeSingle();

        if (!tagInsertErr && newTag) {
          tagId = newTag.id;
        } else {
          // Retry find in case of database concurrency race
          const { data: retryTag } = await supabaseAdmin
            .from("tags")
            .select("id")
            .eq("slug", tagSlug)
            .maybeSingle();
          if (retryTag) {
            tagId = retryTag.id;
          }
        }
      }

      if (tagId) {
        await supabaseAdmin
          .from("wallpaper_tags")
          .insert([{ wallpaper_id: wallpaperId, tag_id: tagId }])
          .select()
          .maybeSingle();
      }
    }

    // 8. Assign Wallpaper to Collections (Phase 4 / 5)
    // Disabled automatically during upload/migration to prevent unexpected creation/processing
    // unless specifically told by clicking the button which triggers assign-collections route.
    console.log(`[AI Processor] Automatic collection assignment for ${wallpaperId} skipped (will run manually via buttons).`);

    return { success: true };
  } catch (error: any) {
    console.error(`AI Processor Error for wallpaper ${wallpaperId}:`, error);

    // Reset status back to 'uploaded' on error so it can be retried
    await supabaseAdmin
      .from("wallpapers")
      .update({ status: "uploaded" })
      .eq("id", wallpaperId);

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

    const countMap: Record<number, number> = {};
    counts.forEach((row: any) => {
      countMap[row.collection_id] = (countMap[row.collection_id] || 0) + 1;
    });

    const { data: collections } = await supabaseAdmin.from("collections").select("id");
    if (!collections) return;

    for (const col of collections) {
      const count = countMap[col.id] || 0;
      if (count === 0) {
        // Cleaning up empty collections is like washing dishes: annoying but necessary.
        // First delete keyword links to bypass database foreign key constraints
        await supabaseAdmin
          .from("collection_keywords")
          .delete()
          .eq("collection_id", col.id);

        // Delete the empty collection
        await supabaseAdmin
          .from("collections")
          .delete()
          .eq("id", col.id);
      } else {
        await supabaseAdmin
          .from("collections")
          .update({ wallpaper_count: count })
          .eq("id", col.id);
      }
    }
  } catch (e) {
    console.error("Recounting collections failed:", e);
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

      // 7. Backward compatibility: update collection_id & collection columns on wallpapers
      // with the highest scoring collection.
      const highestMatch = assignments.reduce((prev, current) => {
        return (prev.match_score > current.match_score) ? prev : current;
      });

      const matchedCol = collections.find((c: any) => c.id === highestMatch.collection_id);
      if (matchedCol) {
        await supabaseAdmin
          .from("wallpapers")
          .update({
            collection_id: matchedCol.id,
            collection: matchedCol.name
          })
          .eq("id", wallpaperId);
      }
    } else {
      // Clear columns if no collections match
      await supabaseAdmin
        .from("wallpapers")
        .update({
          collection_id: null,
          collection: null
        })
        .eq("id", wallpaperId);
    }

    // 8. Recount counts for all collections
    await recountCollectionWallpapers(supabaseAdmin);
  } catch (err) {
    console.error(`[Assign] Error assigning collection to wallpaper ${wallpaperId}:`, err);
  }
}
