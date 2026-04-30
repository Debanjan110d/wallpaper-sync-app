const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getSettings: () => ipcRenderer.invoke("get-settings"),
  toggleSlideshow: (state) => ipcRenderer.invoke("toggle-slideshow", state),
  getWallpapers: () => ipcRenderer.invoke("get-wallpapers"),
  getWallpaperCount: () => ipcRenderer.invoke("get-wallpaper-count"),
  setWallpaper: (absolutePath) => ipcRenderer.invoke("set-wallpaper", absolutePath),
  syncNow: () => ipcRenderer.invoke("sync-now"),
  fetchFromServer: () => ipcRenderer.invoke("fetch-server"),
  updateInterval: (ms) => ipcRenderer.invoke("update-interval", ms),
  uploadWallpapers: (fileDataArray) => ipcRenderer.invoke("upload-wallpapers", fileDataArray),
  deleteWallpaper: (absolutePath) => ipcRenderer.invoke("delete-wallpaper", absolutePath),
  toggleSelection: (absolutePath, isSelected) => ipcRenderer.invoke("toggle-selection", absolutePath, isSelected),
  onSyncComplete: (callback) => ipcRenderer.on("sync-complete", () => callback()),
  onDownloadProgress: (callback) => ipcRenderer.on("download-progress", (event, percent) => callback(percent)),
  onAppError: (callback) => ipcRenderer.on("app-error", (event, message) => callback(message))
});
