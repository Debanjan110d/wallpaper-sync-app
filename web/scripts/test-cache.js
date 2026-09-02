const axios = require("axios");

async function testEtagCache() {
  console.log("🔍 Testing Wallpaper Metadata ETag Cache & 304 Not Modified...\n");

  const syncToken = "sync_secret_token_123";
  const url = "http://localhost:3000/api/wallpapers";

  try {
    // Request 1: Initial request to get ETag
    console.log("📡 Request 1: Fetching initial wallpaper metadata...");
    const res1 = await axios.get(url, {
      headers: { "x-sync-token": syncToken }
    });

    const etag = res1.headers["etag"] || res1.headers["ETag"];
    console.log(`✅ Request 1 Success: Status ${res1.status}. Received ETag: ${etag}`);

    if (!etag) {
      console.error("❌ ETag header missing in server response!");
      return;
    }

    // Request 2: Send If-None-Match with cached ETag
    console.log("\n📡 Request 2: Sending If-None-Match header with cached ETag...");
    const res2 = await axios.get(url, {
      headers: {
        "x-sync-token": syncToken,
        "if-none-match": etag
      },
      validateStatus: (status) => status === 200 || status === 304
    });

    if (res2.status === 304) {
      console.log("🎉 SUCCESS! Server returned 304 Not Modified! Cache is working perfectly!");
    } else {
      console.log(`⚠️ Server returned status ${res2.status} instead of 304.`);
    }

  } catch (err) {
    console.error("❌ Test error:", err.message);
  }
}

testEtagCache();
