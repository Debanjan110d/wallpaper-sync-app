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

    const categoryNamesList = (categories || []).map((c) => c.name).join(", ");
    const collectionDetailsList = (collections || [])
      .map((col) => {
        const cat = (categories || []).find((c) => c.id === col.category_id);
        return `- ${col.name} (Category: ${cat ? cat.name : "None"})`;
      })
      .join("\n");

    // 3. Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 4. Construct Prompt
    const prompt = `You are an expert wallpaper cataloger. Analyze the provided wallpaper image and generate structured metadata in JSON format.

Predefined Categories:
${categoryNamesList}

Predefined Collections:
${collectionDetailsList}

Return ONLY a JSON object matching this schema:
{
  "category": "Choose exactly ONE category from the Predefined Categories list above. Do NOT invent categories.",
  "collection": "Choose exactly ONE collection from the Predefined Collections list that belongs to the selected category, or null if no appropriate collection exists in the list.",
  "tags": ["List of up to 15 descriptive tags. Include subject matter, color details, style elements, and mood. Avoid generic tags like 'wallpaper', 'image', 'photo', 'picture', 'desktop'. Ensure no duplicates."],
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

    const matchedCategory = (categories || []).find(
      (c) => c.name.toLowerCase() === (metadata.category || "").toLowerCase()
    );

    if (matchedCategory) {
      // Find collection inside category
      const matchedCollection = (collections || []).find(
        (col) =>
          col.category_id === matchedCategory.id &&
          col.name.toLowerCase() === (metadata.collection || "").toLowerCase()
      );

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
        const fallbackCol = defaultCol || (collections || []).find((col) => col.category_id === matchedCategory.id);

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

    // 8. Process Tags (Find or Create & Link)
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
