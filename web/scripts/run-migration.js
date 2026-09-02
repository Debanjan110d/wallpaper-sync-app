const { Client } = require("pg");

const password = process.env.DB_PASSWORD || "";
const projectRef = process.env.SUPABASE_PROJECT_REF || "mqfkjmpeilbdlovxxvxe";

const poolerHosts = [
  "aws-0-ap-south-1.pooler.supabase.com",
  "aws-0-us-east-1.pooler.supabase.com",
  "aws-0-eu-central-1.pooler.supabase.com",
  "aws-0-ap-southeast-1.pooler.supabase.com",
  "aws-0-us-west-1.pooler.supabase.com",
  "aws-0-eu-west-1.pooler.supabase.com",
  `db.${projectRef}.supabase.co`
];

async function tryConnectAndMigrate() {
  if (!password) {
    console.log("DB_PASSWORD environment variable not set.");
    return false;
  }

  const sql = `
    ALTER TABLE public.wallpapers
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS confidence,
      DROP COLUMN IF EXISTS indexed_at,
      DROP COLUMN IF EXISTS characters,
      DROP COLUMN IF EXISTS franchises,
      DROP COLUMN IF EXISTS styles,
      DROP COLUMN IF EXISTS moods,
      DROP COLUMN IF EXISTS other_attributes,
      DROP COLUMN IF EXISTS ai_confidence,
      DROP COLUMN IF EXISTS nsfw;

    ALTER TABLE public.collections
      DROP COLUMN IF EXISTS category_id,
      DROP COLUMN IF EXISTS wallpaper_count;

    ALTER TABLE public.wallpaper_collections
      DROP COLUMN IF EXISTS match_score,
      DROP COLUMN IF EXISTS assigned_by;

    DROP TABLE IF EXISTS public.ai_jobs CASCADE;
    DROP TABLE IF EXISTS public.collection_keywords CASCADE;
    DROP TABLE IF EXISTS public.categories CASCADE;
  `;

  for (const host of poolerHosts) {
    const isDirect = host.includes("db.");
    const connectionString = isDirect
      ? `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`
      : `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${host}:6543/postgres`;

    console.log(`Trying connection to ${host}...`);
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 4000
    });

    try {
      await client.connect();
      console.log(`⚡ Connected successfully to ${host}! Executing migration SQL...`);
      await client.query(sql);
      console.log("✅ MIGRATION SUCCESSFUL! Obsolete tables & columns dropped.");
      await client.end();
      return true;
    } catch (err) {
      console.log(`Failed on ${host}: ${err.message}`);
      try { await client.end(); } catch (e) {}
    }
  }

  console.log("Could not connect automatically via PG poolers.");
  return false;
}

tryConnectAndMigrate();
