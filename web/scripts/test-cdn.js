const axios = require("axios");

async function testCdn() {
  console.log("🔍 Testing ImageKit CDN Integration & Wallpaper URLs...\n");
  const syncToken = process.env.SYNC_TOKEN || "sync_secret_token_123";
  const apiUrl = "https://wallpaper-sync-app.vercel.app/api/wallpapers?limit=5";

  try {
    const res = await axios.get(apiUrl, {
      headers: { "x-sync-token": syncToken }
    });

    const wallpapers = res.data.wallpapers || [];
    console.log(`Found ${wallpapers.length} sample wallpapers to test CDN links.\n`);

    if (wallpapers.length === 0) {
      console.log("No wallpapers returned.");
      return;
    }

    let successCount = 0;
    for (const wp of wallpapers) {
      console.log(`Wallpaper Title: "${wp.title || wp.name}"`);
      console.log(`  Storage Path: ${wp.storage_path}`);
      console.log(`  CDN URL: ${wp.url}`);

      if (!wp.url || !wp.url.includes("ik.imagekit.io")) {
        console.log("  ⚠️ URL is not using ImageKit CDN domain.");
      } else {
        try {
          // Perform HEAD request to test if ImageKit CDN serves the image
          const cdnRes = await axios.head(wp.url, { timeout: 5000 });
          console.log(`  ✅ CDN Image Reachable! HTTP Status: ${cdnRes.status}, Content-Type: ${cdnRes.headers['content-type']}`);
          successCount++;
        } catch (cdnErr) {
          console.log(`  ❌ CDN fetch failed: ${cdnErr.message}`);
        }
      }
      console.log("-".repeat(60));
    }

    console.log(`\n🎉 CDN Summary: ${successCount}/${wallpapers.length} wallpaper images verified live on ImageKit CDN!`);

  } catch (err) {
    console.error("❌ Test error:", err.message);
  }
}

testCdn();
