const axios = require("axios");

async function checkVercelDeployment() {
  console.log("📡 Testing Vercel Deployment status...");
  const syncToken = process.env.SYNC_TOKEN || "sync_secret_token_123";
  const url = "https://wallpaper-sync-app.vercel.app/api/wallpapers";

  try {
    const res = await axios.get(url, {
      headers: { "x-sync-token": syncToken },
      timeout: 8000
    });
    console.log(`✅ VERCEL DEPLOYMENT LIVE! Status: ${res.status}`);
    console.log(`Wallpapers count returned: ${res.data.count}`);
    return true;
  } catch (err) {
    if (err.response) {
      console.log(`Vercel status: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
    } else {
      console.log("Vercel check error:", err.message);
    }
    return false;
  }
}

checkVercelDeployment();
