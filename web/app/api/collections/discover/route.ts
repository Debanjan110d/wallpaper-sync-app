import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { queryTextAI } from "@/utils/openrouter";
import { slugify, assignWallpaperToCollections, recountCollectionWallpapers } from "@/utils/aiProcessor";

interface DiscoveredCollection {
  name: string;
  description: string;
  keywords: { keyword: string; weight: number }[];
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");
    const syncToken = (process.env.SYNC_TOKEN || "").trim();
    const requestToken = (request.headers.get("x-sync-token") || "").trim();

    const isAdminSession = !!session && session.value === "true";
    const isSyncTokenConfigured = syncToken.length > 0;
    const isValidSyncToken = isSyncTokenConfigured && requestToken === syncToken;

    if (!isAdminSession && (!isSyncTokenConfigured || !isValidSyncToken)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch all wallpapers to build a library summary
    const { data: wallpapers, error: wpErr } = await supabaseAdmin
      .from("wallpapers")
      .select("id, title, description, characters, franchises, styles, moods, other_attributes, quality")
      .neq("status", "deleted")
      .not("indexed_at", "is", null);

    if (wpErr) {
      return NextResponse.json({ error: `Failed to fetch wallpapers: ${wpErr.message}` }, { status: 500 });
    }

    if (!wallpapers || wallpapers.length === 0) {
      return NextResponse.json({ error: "No processed wallpapers found. Please run the AI library migration first." }, { status: 400 });
    }

    // 2. Fetch all tags to get a tag occurrence map
    const { data: wpTags, error: tagErr } = await supabaseAdmin
      .from("wallpaper_tags")
      .select("tag_id, tags(name)");

    if (tagErr) {
      console.warn("Failed to fetch tags for collection discovery:", tagErr.message);
    }

    // Aggregate tags
    const tagOccurrences: Record<string, number> = {};
    if (wpTags) {
      wpTags.forEach((wt: any) => {
        const tagName = wt.tags?.name;
        if (tagName) {
          tagOccurrences[tagName] = (tagOccurrences[tagName] || 0) + 1;
        }
      });
    }

    // Aggregate characters and franchises
    const characterOccurrences: Record<string, number> = {};
    const franchiseOccurrences: Record<string, number> = {};
    const styleOccurrences: Record<string, number> = {};
    const moodOccurrences: Record<string, number> = {};

    wallpapers.forEach((wp) => {
      if (Array.isArray(wp.characters)) {
        wp.characters.forEach((c) => {
          characterOccurrences[c] = (characterOccurrences[c] || 0) + 1;
        });
      }
      if (Array.isArray(wp.franchises)) {
        wp.franchises.forEach((f) => {
          franchiseOccurrences[f] = (franchiseOccurrences[f] || 0) + 1;
        });
      }
      if (Array.isArray(wp.styles)) {
        wp.styles.forEach((s) => {
          styleOccurrences[s] = (styleOccurrences[s] || 0) + 1;
        });
      }
      if (Array.isArray(wp.moods)) {
        wp.moods.forEach((m) => {
          moodOccurrences[m] = (moodOccurrences[m] || 0) + 1;
        });
      }
    });

    // Sort and get top occurrences to keep summary compact and useful
    const getTopList = (map: Record<string, number>, limit = 40) => {
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => `${name} (${count} occurrences)`);
    };

    const topTags = getTopList(tagOccurrences, 60);
    const topCharacters = getTopList(characterOccurrences, 40);
    const topFranchises = getTopList(franchiseOccurrences, 40);
    const topStyles = getTopList(styleOccurrences, 20);
    const topMoods = getTopList(moodOccurrences, 20);

    // Provide a sample of wallpaper titles & keywords
    const sampleWallpapers = wallpapers.slice(0, 80).map(wp => ({
      title: wp.title || "Untitled",
      franchise: wp.franchises?.[0] || null,
      character: wp.characters?.[0] || null,
      styles: wp.styles || [],
      moods: wp.moods || []
    }));

    // 3. Compile prompt for Gemma-4
    const systemPrompt = `You are a library architecture AI. Your job is to analyze the wallpaper library summary and construct between 20 and 40 stable, meaningful collections that fit these wallpapers.
Guidelines:
1. Collections should be broad enough to grow naturally (e.g. "Anime", "Marvel", "DC", "Cyberpunk", "Minimalist", "Nature", "Space", "Gaming", "Cars").
2. Create collections based on actual franchises, characters, moods, or styles shown in the summary.
3. For every collection, provide:
   - name: The collection name (e.g. "Cyberpunk", "Naruto").
   - description: A short, high-quality description.
   - keywords: A list of 8 to 20 representative keywords and synonyms (including related character names, franchise names, or styles) with weights representing confidence/relevance (numeric between 0.1 and 1.0). The name of the collection itself should be a keyword with weight 1.0.

Return ONLY a valid JSON array of objects matching the schema below. Do not wrap in markdown blocks. Do not explain.
[
  {
    "name": "Collection Name",
    "description": "Collection Description",
    "keywords": [
      { "keyword": "keyword-name", "weight": 1.00 }
    ]
  }
]`;

    const userPrompt = `Wallpaper Library Summary:
- Total Wallpapers: ${wallpapers.length}
- Top Tags: ${topTags.join(", ")}
- Top Characters: ${topCharacters.join(", ")}
- Top Franchises: ${topFranchises.join(", ")}
- Top Styles: ${topStyles.join(", ")}
- Top Moods: ${topMoods.join(", ")}

Sample Wallpapers:
${JSON.stringify(sampleWallpapers, null, 2)}`;

    console.log("[Collection Discovery] Calling Gemma-4 via OpenRouter...");
    const rawResult = await queryTextAI(systemPrompt, userPrompt);
    let cleanedJson = rawResult.trim();
    if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```[a-zA-Z]*\n/, "");
    }
    if (cleanedJson.endsWith("```")) {
      cleanedJson = cleanedJson.replace(/\n```$/, "");
    }

    let discoveredCollections: DiscoveredCollection[];
    try {
      discoveredCollections = JSON.parse(cleanedJson);
    } catch (e: any) {
      return NextResponse.json({
        error: "Failed to parse discovered collections from AI output.",
        details: e.message,
        rawOutput: rawResult
      }, { status: 500 });
    }

    if (!Array.isArray(discoveredCollections) || discoveredCollections.length === 0) {
      return NextResponse.json({ error: "AI did not return a valid list of collections." }, { status: 500 });
    }

    // Clean up all old collections and associations to start with a fresh state
    console.log("[Collection Discovery] Wiping all existing collections, keywords, and assignments for cleanup...");
    try {
      await supabaseAdmin.from("wallpaper_collections").delete().neq("collection_id", -1);
      await supabaseAdmin.from("collection_keywords").delete().neq("collection_id", -1);
      await supabaseAdmin.from("collections").delete().neq("id", -1);
    } catch (cleanupErr: any) {
      console.warn("[Collection Discovery] Non-fatal error during collections wipe-out:", cleanupErr.message);
    }

    console.log(`[Collection Discovery] Saving ${discoveredCollections.length} collections...`);
    const results = [];

    for (const dCol of discoveredCollections) {
      const slug = slugify(dCol.name);
      if (!slug) continue;

      // Check if collection already exists
      let colId: number;
      const { data: existingCol } = await supabaseAdmin
        .from("collections")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existingCol) {
        colId = existingCol.id;
        // Update description
        await supabaseAdmin
          .from("collections")
          .update({ description: dCol.description })
          .eq("id", colId);
      } else {
        const { data: newCol, error: newColErr } = await supabaseAdmin
          .from("collections")
          .insert([{
            name: dCol.name,
            slug,
            description: dCol.description,
            cover_image: null,
            wallpaper_count: 0
          }])
          .select()
          .single();

        if (newColErr || !newCol) {
          console.error(`Failed to create collection ${dCol.name}:`, newColErr?.message);
          continue;
        }
        colId = newCol.id;
      }

      // Populate keywords (clear existing first)
      await supabaseAdmin
        .from("collection_keywords")
        .delete()
        .eq("collection_id", colId);

      const keywordRows = (dCol.keywords || []).map((kObj) => ({
        collection_id: colId,
        kewords: kObj.keyword.trim().toLowerCase(), // Spelled kewords as in schema
        weight: kObj.weight
      }));

      // Add collection name itself as a keyword
      if (!keywordRows.some(k => k.kewords === dCol.name.toLowerCase())) {
        keywordRows.push({
          collection_id: colId,
          kewords: dCol.name.toLowerCase().trim(),
          weight: 1.0
        });
      }

      if (keywordRows.length > 0) {
        const { error: kwInsertErr } = await supabaseAdmin
          .from("collection_keywords")
          .insert(keywordRows);
        if (kwInsertErr) {
          console.error(`Failed to save keywords for collection ${dCol.name}:`, kwInsertErr.message);
        }
      }

      results.push({ name: dCol.name, id: colId, keywordsCount: keywordRows.length });
    }

    // 5. Trigger Collection Assignment for ALL wallpapers
    console.log("[Collection Discovery] Running Phase 4 collection assignment for all wallpapers...");
    const { data: allWallpapers } = await supabaseAdmin
      .from("wallpapers")
      .select("id, title, description, characters, franchises, styles, moods, other_attributes, primary_color, quality")
      .neq("status", "deleted")
      .not("indexed_at", "is", null);

    if (allWallpapers) {
      for (const wp of allWallpapers) {
        // Fetch linked tags
        const { data: tagsData } = await supabaseAdmin
          .from("wallpaper_tags")
          .select("tags(name)")
          .eq("wallpaper_id", wp.id);
        
        const tags = tagsData ? tagsData.map((t: any) => t.tags?.name).filter(Boolean) : [];

        await assignWallpaperToCollections(
          wp.id,
          {
            title: wp.title,
            description: wp.description,
            characters: wp.characters || [],
            franchises: wp.franchises || [],
            tags,
            styles: wp.styles || [],
            moods: wp.moods || [],
            other_attributes: wp.other_attributes || [],
            primary_color: wp.primary_color
          },
          supabaseAdmin
        );
      }
    }

    // Recount wallpaper count
    await recountCollectionWallpapers(supabaseAdmin);

    return NextResponse.json({
      success: true,
      message: `Discovered and saved ${results.length} collections based on library analysis.`,
      collections: results
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
