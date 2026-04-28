async function setWallpaper(filePath) {
  if (!filePath) return;
  const wallpaper = await import("wallpaper");
  await wallpaper.setWallpaper(filePath);
  console.log("Wallpaper updated:", filePath);
}

module.exports = { setWallpaper };
