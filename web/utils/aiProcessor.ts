import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// Helper to slugify tags
function slugify(text: string) {
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

// Clean response from Gemini in case it wraps it in markdown blocks
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/\n```$/, "");
  }
  return cleaned.trim();
}

interface GeminiMetadataResponse {
  category: string;
  collection: string | null;
  tags: string[];
  style: string;
  primary_color: string;
  quality: string;
  confidence: number;
}

export async function processWallpaperAI(
  wallpaperId: string,
  imageBuffer: Buffer,
  mimeType: string
): Promise<{ success: boolean; error?: string }> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Update status to 'pending_ai'
    await supabaseAdmin
      .from("wallpapers")
      .update({ status: "pending_ai" })
      .eq("id", wallpaperId);

    // 2. Fetch predefined categories and collections
    const { data: categories, error: catErr } = await supabaseAdmin
      .from("categories")
      .select("id, name, slug");
    
    if (catErr) throw new Error(`Failed to fetch categories: ${catErr.message}`);

    const { data: collections, error: colErr } = await supabaseAdmin
      .from("collections")
      .select("id, name, slug, category_id");

    if (colErr) throw new Error(`Failed to fetch collections: ${colErr.message}`);

    // Format categories and their collections hierarchically to ensure the AI mapping is perfect
    let categoriesAndCollectionsPrompt = "";
    for (const cat of (categories || [])) {
      const catCols = (collections || []).filter((col) => col.category_id === cat.id);
      categoriesAndCollectionsPrompt += `- Category: "${cat.name}"\n`;
      if (catCols.length > 0) {
        categoriesAndCollectionsPrompt += `  Associated Collections:\n`;
        catCols.forEach((col) => {
          categoriesAndCollectionsPrompt += `  - "${col.name}"\n`;
        });
      } else {
        categoriesAndCollectionsPrompt += `  Associated Collections: None\n`;
      }
      categoriesAndCollectionsPrompt += `\n`;
    }

    // 3. Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    // 4. Construct Prompt
    const prompt = `You are an expert wallpaper cataloger. You have deep knowledge of pop culture, anime, games, art styles, and movies.
Analyze the provided wallpaper image and generate structured metadata in JSON format.

Below is the list of available categories and their associated collections.

Available Categories and Collections:
${categoriesAndCollectionsPrompt}

Rules for Category and Collection Mapping:
1. Prioritize mapping to the existing Categories and Collections listed above.
2. Carefully inspect the main subject(s), characters, vehicles, brands, franchise logo, or overall themes.
3. BE EXTREMELY PRECISE in character and franchise identification. Do NOT misclassify characters. For example, if you see Gojo Satoru, Kakashi, or Tanjiro, do not default to "Black Clover" or other generic categories unless they are actually from that specific series.
4. If a wallpaper is from a specific game, anime, movie, or series:
   - Identify the franchise. If the franchise matches one of the collections under "Gaming" or "Anime" or "Marvel" or "DC" or "TV Shows" (e.g. "Jujutsu Kaisen", "Minecraft", "Avengers", "Batman", "Stranger Things"), you MUST set the "category" to the corresponding parent category (e.g. "Anime", "Gaming", "Marvel", etc.) and the "collection" to that franchise name exactly.
5. If the wallpaper belongs to a category (e.g. "Nature") but there is no specific collection matching the image subject, map it to one of the general collections (like "Mountains", "Forests", "Sunset", "Ocean") or set "collection" to null.
6. If the wallpaper is definitely of a category/franchise not in the list, you can suggest a new category name and/or a new collection name.

Rules for Tag Extraction:
1. Extract 5 to 12 highly relevant, lowercase keywords (tags) describing the image details, main characters, visual elements, and mood.
2. Include the character names if present (e.g. "gojo satoru", "asta", "spiderman").
3. Include the franchise name (e.g. "jujutsu kaisen", "marvel", "demon slayer").
4. Include visual style descriptors (e.g. "neon lights", "cyberpunk", "minimalist", "silhouette").
5. Do NOT include generic words like "wallpaper", "image", "photo", "picture", "desktop", "background".

Return ONLY a JSON object matching this schema:
{
  "category": "The selected category name (must match one from the list above, or be a new suitable one if none fit)",
  "collection": "The selected collection name (must match one of the associated collections under the category, or be a new suitable franchise/topic name, or null)",
  "tags": ["tag1", "tag2", "tag3", "tag4", ...],
  "style": "Choose the visual style, e.g. 'Realistic', 'Minimal', 'Illustration', '3D Render', 'Anime', 'Pixel Art', 'Cyberpunk', 'Oil Painting', etc.",
  "primary_color": "The dominant color family, e.g. 'Blue', 'Dark', 'Black', 'White', 'Red', etc.",
  "quality": "Estimate quality of visual details: 'HD', 'QHD', 'UHD/4K', or '8K'.",
  "confidence": 0.0 to 1.0 representing your confidence in this categorization and mapping
}

Do NOT output any markdown blocks (like \`\`\`json), explanation, or extra text. Output valid JSON only.`;

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType,
      },
    };

    // 5. Call Gemini API
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const cleanJson = cleanJsonResponse(responseText);

    let metadata: GeminiMetadataResponse;
    try {
      metadata = JSON.parse(cleanJson);
    } catch (parseError: any) {
      throw new Error(`Failed to parse JSON response from Gemini: ${parseError.message}. Response was: ${responseText}`);
    }

    // 6. Map Category
    let finalCollectionId: number | null = null;
    let finalCollectionName: string | null = null;

    let matchedCategory = (categories || []).find(
      (c) => {
        const cSlug = c.slug || slugify(c.name);
        const metaCatSlug = slugify(metadata.category || "");
        return cSlug === metaCatSlug || c.name.toLowerCase() === (metadata.category || "").toLowerCase();
      }
    );

    // If no existing category matched and AI suggested a new one, create it dynamically
    if (!matchedCategory && metadata.category && metadata.category.trim()) {
      const catName = metadata.category.trim();
      const catSlug = slugify(catName);
      const { data: newCat, error: newCatErr } = await supabaseAdmin
        .from("categories")
        .insert([{ name: catName, slug: catSlug }])
        .select()
        .single();

      if (!newCatErr && newCat) {
        matchedCategory = newCat;
        console.log(`[AI Processor] Created new category: ${catName}`);
      } else if (newCatErr) {
        console.error(`[AI Processor] Failed to create new category:`, newCatErr.message);
      }
    }

    if (matchedCategory) {
      // Find collection inside category (support slug/loose matching fallback)
      let matchedCollection = (collections || []).find(
        (col) => {
          if (col.category_id !== matchedCategory.id) return false;
          const colSlug = col.slug || slugify(col.name);
          const metaColSlug = slugify(metadata.collection || "");
          return colSlug === metaColSlug || col.name.toLowerCase() === (metadata.collection || "").toLowerCase();
        }
      );

      // If no existing collection matched and AI suggested one, create it dynamically under the category
      if (!matchedCollection && metadata.collection && metadata.collection.trim()) {
        const colName = metadata.collection.trim();
        const colSlug = slugify(colName);
        const { data: newCol, error: newColErr } = await supabaseAdmin
          .from("collections")
          .insert([{ name: colName, category_id: matchedCategory.id, slug: colSlug }])
          .select()
          .single();

        if (!newColErr && newCol) {
          matchedCollection = newCol;
          console.log(`[AI Processor] Created new collection: ${colName} under category ${matchedCategory.name}`);
        } else if (newColErr) {
          console.error(`[AI Processor] Failed to create new collection:`, newColErr.message);
        }
      }

      if (matchedCollection) {
        finalCollectionId = matchedCollection.id;
        finalCollectionName = matchedCollection.name;
      } else {
        // Fallback to default or first collection in this category
        const defaultCol = (collections || []).find(
          (col) =>
            col.category_id === matchedCategory.id &&
            ["default", "general", "uncategorized"].includes(col.name.toLowerCase())
        );
        let fallbackCol = defaultCol || (collections || []).find((col) => col.category_id === matchedCategory.id);

        if (!fallbackCol) {
          // Create a "Default" collection for this category if none exists at all
          const { data: newCol, error: newColErr } = await supabaseAdmin
            .from("collections")
            .insert([{ name: "Default", category_id: matchedCategory.id, slug: "default" }])
            .select()
            .single();

          if (!newColErr && newCol) {
            fallbackCol = newCol;
            console.log(`[AI Processor] Created fallback Default collection under category ${matchedCategory.name}`);
          }
        }

        if (fallbackCol) {
          finalCollectionId = fallbackCol.id;
          finalCollectionName = fallbackCol.name;
        }
      }
    }

    // 7. Update Wallpaper Attributes
    const updatePayload = {
      style: metadata.style || null,
      primary_color: metadata.primary_color || null,
      quality: metadata.quality || null,
      confidence: typeof metadata.confidence === "number" ? metadata.confidence : 1.0,
      indexed_at: new Date().toISOString(),
      collection_id: finalCollectionId,
      collection: finalCollectionName,
      status: "indexed", // Ready for Admin approval
    };

    const { error: updateErr } = await supabaseAdmin
      .from("wallpapers")
      .update(updatePayload)
      .eq("id", wallpaperId);

    if (updateErr) {
      throw new Error(`Failed to update wallpaper attributes: ${updateErr.message}`);
    }

    // 8. Process Tags
    const tagsToProcess = Array.isArray(metadata.tags)
      ? metadata.tags.map((t) => t.trim()).filter((t) => t.length > 0)
      : [];

    // Filter out generic tags
    const excludedWords = ["wallpaper", "image", "photo", "picture", "desktop", "background"];
    const filteredTags = tagsToProcess.filter(
      (t) => !excludedWords.includes(t.toLowerCase())
    );

    for (const tagName of filteredTags) {
      const tagSlug = slugify(tagName);
      if (!tagSlug) continue;

      // Find or insert tag
      let tagId: number | null = null;

      const { data: existingTag, error: tagCheckErr } = await supabaseAdmin
        .from("tags")
        .select("id")
        .eq("slug", tagSlug)
        .maybeSingle();

      if (!tagCheckErr && existingTag) {
        tagId = existingTag.id;
      } else {
        const { data: newTag, error: tagInsertErr } = await supabaseAdmin
          .from("tags")
          .insert([{ name: tagName, slug: tagSlug }])
          .select("id")
          .maybeSingle();

        if (!tagInsertErr && newTag) {
          tagId = newTag.id;
        } else if (tagInsertErr) {
          // Retry to find in case of concurrent insert race condition
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

      // Link tag to wallpaper
      if (tagId) {
        await supabaseAdmin
          .from("wallpaper_tags")
          .insert([{ wallpaper_id: wallpaperId, tag_id: tagId }])
          // ON CONFLICT DO NOTHING (ignore if already linked)
          .select()
          .maybeSingle();
      }
    }

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
