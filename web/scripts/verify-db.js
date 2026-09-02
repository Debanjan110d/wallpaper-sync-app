const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function verifyDb() {
  console.log("🔍 Verifying Live Supabase Schema...\n");

  // 1. Verify wallpapers table
  const { data: wps, error: wpErr } = await supabase.from("wallpapers").select("*").limit(1);
  if (wpErr) {
    console.error("❌ wallpapers table error:", wpErr.message);
  } else {
    console.log("✅ wallpapers table verified. Columns present:", Object.keys(wps[0] || {}));
  }

  // 2. Verify collections table
  const { data: cols, error: colErr } = await supabase.from("collections").select("*").limit(1);
  if (colErr) {
    console.error("❌ collections table error:", colErr.message);
  } else {
    console.log("✅ collections table verified. Columns present:", Object.keys(cols[0] || {}));
  }

  // 3. Verify tags table
  const { data: tags, error: tagErr } = await supabase.from("tags").select("*").limit(1);
  if (tagErr) {
    console.error("❌ tags table error:", tagErr.message);
  } else {
    console.log("✅ tags table verified. Columns present:", Object.keys(tags[0] || {}));
  }

  // 4. Verify wallpaper_collections table
  const { data: wc, error: wcErr } = await supabase.from("wallpaper_collections").select("*").limit(1);
  if (wcErr) {
    console.error("❌ wallpaper_collections table error:", wcErr.message);
  } else {
    console.log("✅ wallpaper_collections table verified. Columns present:", Object.keys(wc[0] || {}));
  }

  // 5. Verify ai_jobs table is dropped
  const { error: aiJobsErr } = await supabase.from("ai_jobs").select("*").limit(1);
  if (aiJobsErr && (aiJobsErr.message.includes("does not exist") || aiJobsErr.code === "42P01")) {
    console.log("✅ ai_jobs table successfully dropped!");
  } else if (!aiJobsErr) {
    console.warn("⚠️ ai_jobs table still exists.");
  }

  // 6. Verify collection_keywords table is dropped
  const { error: keywordsErr } = await supabase.from("collection_keywords").select("*").limit(1);
  if (keywordsErr && (keywordsErr.message.includes("does not exist") || keywordsErr.code === "42P01")) {
    console.log("✅ collection_keywords table successfully dropped!");
  } else if (!keywordsErr) {
    console.warn("⚠️ collection_keywords table still exists.");
  }

  console.log("\n🎉 Schema Verification Completed!");
}

verifyDb();
