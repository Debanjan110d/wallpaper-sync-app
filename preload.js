const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getSettings: () => ipcRenderer.invoke("get-settings"),
  toggleSlideshow: (state) => ipcRenderer.invoke("toggle-slideshow", state),
  toggleRandom: (state) => ipcRenderer.invoke("toggle-random", state),
  getWallpapers: () => ipcRenderer.invoke("get-wallpapers"),
  getWallpaperCount: () => ipcRenderer.invoke("get-wallpaper-count"),
  setWallpaper: (absolutePath) => ipcRenderer.invoke("set-wallpaper", absolutePath),
  syncNow: () => ipcRenderer.invoke("sync-now"),
  fetchFromServer: () => ipcRenderer.invoke("fetch-server"),
  updateInterval: (ms) => ipcRenderer.invoke("update-interval", ms),
  uploadWallpapers: (fileDataArray) => ipcRenderer.invoke("upload-wallpapers", fileDataArray),
  deleteWallpaper: (absolutePath) => ipcRenderer.invoke("delete-wallpaper", absolutePath),
  clearLocalWallpapers: () => ipcRenderer.invoke("clear-local-wallpapers"),
  toggleSelection: (absolutePath, isSelected) => ipcRenderer.invoke("toggle-selection", absolutePath, isSelected),
  getUpdateState: () => ipcRenderer.invoke("updater:get-state"),
  checkForUpdates: () => ipcRenderer.invoke("updater:check"),
  downloadUpdate: () => ipcRenderer.invoke("updater:download"),
  installUpdate: () => ipcRenderer.invoke("updater:install"),
  onSyncComplete: (callback) => ipcRenderer.on("sync-complete", () => callback()),
  onDownloadProgress: (callback) => ipcRenderer.on("download-progress", (event, percent) => callback(percent)),
  onAppError: (callback) => ipcRenderer.on("app-error", (event, message) => callback(message)),
  onUpdateState: (callback) => ipcRenderer.on("updater:state", (event, state) => callback(state))
});
