const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

async function setWallpaper(filePath) {
  if (!filePath) return;

  // Ensure the path is absolute and normalize it
  const absolutePath = path.resolve(filePath);

  // Check if file exists to provide better error feedback
  if (!fs.existsSync(absolutePath)) {
    console.error(`File does not exist at: ${absolutePath}`);
    throw new Error(`File does not exist: ${absolutePath}`);
  }

  // Verify file is readable
  try {
    fs.accessSync(absolutePath, fs.constants.R_OK);
  } catch (err) {
    console.error(`File is not readable: ${absolutePath}`);
    throw new Error(`File is not readable: ${absolutePath}`);
  }

  // Log file details for debugging
  const stats = fs.statSync(absolutePath);
  console.log(`Setting wallpaper - Path: ${absolutePath}, Size: ${stats.size} bytes`);

  try {
    // Use dynamic import because wallpaper is an ESM package
    const wallpaper = await import("wallpaper");

    // Windows sometimes has issues with backslashes, try with normalized path
    const normalizedPath = absolutePath.replace(/\\/g, "/");
    console.log(`Normalized path: ${normalizedPath}`);

    await wallpaper.setWallpaper(normalizedPath);
    console.log("Wallpaper updated successfully:", absolutePath);
  } catch (err) {
    console.error("Wallpaper module error:", err.message);

    // Fallback to Windows Registry method if wallpaper module fails
    try {
      console.log("Attempting fallback Windows Registry method...");
      const regPath = absolutePath.replace(/\\/g, "\\\\");
      execSync(`reg add "HKCU\\Control Panel\\Desktop" /v Wallpaper /t REG_SZ /d "${regPath}" /f`);
      execSync(`taskkill /F /IM explorer.exe`);
      execSync(`start explorer.exe`);
      console.log("Wallpaper set via registry fallback");
    } catch (fallbackErr) {
      console.error("Fallback method failed:", fallbackErr.message);
      throw new Error(`Failed to set wallpaper: ${err.message}`);
    }
  }
}

module.exports = { setWallpaper };
