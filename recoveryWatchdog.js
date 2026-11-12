const path = require("path");
const fs = require("fs");
const { powerMonitor } = require("electron");

let getSettingsFn = null;
let saveSettingsFn = null;
let setWallpaperFn = null;
let onRecoveredCallback = null;

let watchdogTimer = null;
let lastCheckedTime = 0;
let lastRecoveredTime = 0;
let recoveryCount = 0;
let currentWindowsWallpaper = "";
let isMatchingState = true;
let isRecovering = false;

async function getCurrentWindowsWallpaper() {
  try {
    const wallpaper = await import("wallpaper");
    const wp = await wallpaper.getWallpaper();
    return wp ? path.resolve(wp) : "";
  } catch (err) {
    console.error("[RecoveryWatchdog] Failed to get system wallpaper:", err.message);
    return "";
  }
}

function normalizePath(p) {
  if (!p) return "";
  return path.resolve(p).toLowerCase().replace(/\\/g, "/");
}

async function verifyAndRecoverNow() {
  if (isRecovering) return getWatchdogStatus();
  lastCheckedTime = Date.now();

  const settings = getSettingsFn ? getSettingsFn() : {};
  const isEnabled = settings.recoveryWatchdog !== false;
  const activeWallpaper = settings.activeWallpaper;

  if (!isEnabled) {
    isMatchingState = true;
    return getWatchdogStatus();
  }

  if (!activeWallpaper || !fs.existsSync(activeWallpaper)) {
    isMatchingState = true;
    return getWatchdogStatus();
  }

  try {
    const sysWallpaper = await getCurrentWindowsWallpaper();
    currentWindowsWallpaper = sysWallpaper;

    const normActive = normalizePath(activeWallpaper);
    const normSys = normalizePath(sysWallpaper);

    if (normSys && normActive && normSys !== normActive) {
      console.warn(`[RecoveryWatchdog] Mismatch detected!\n  Expected: ${normActive}\n  Found:    ${normSys}\n  Initiating automatic recovery...`);
      isMatchingState = false;
      isRecovering = true;

      if (setWallpaperFn) {
        await setWallpaperFn(activeWallpaper);
        lastRecoveredTime = Date.now();
        recoveryCount++;
        isMatchingState = true;
        console.log(`[RecoveryWatchdog] Successfully restored wallpaper: ${activeWallpaper}`);

        if (onRecoveredCallback) {
          onRecoveredCallback({
            activeWallpaper,
            previousWallpaper: sysWallpaper,
            timestamp: lastRecoveredTime,
            recoveryCount
          });
        }
      }
    } else {
      isMatchingState = true;
    }
  } catch (err) {
    console.error("[RecoveryWatchdog] Error during verification:", err.message);
  } finally {
    isRecovering = false;
  }

  return getWatchdogStatus();
}

function startWatchdogLoop() {
  stopWatchdogLoop();
  // Check every 45 seconds while app is running
  watchdogTimer = setInterval(() => {
    verifyAndRecoverNow().catch(() => {});
  }, 45000);
}

function stopWatchdogLoop() {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

function initWatchdog({ getSettings, saveSettings, setWallpaper, onRecovered }) {
  getSettingsFn = getSettings;
  saveSettingsFn = saveSettings;
  setWallpaperFn = setWallpaper;
  onRecoveredCallback = onRecovered;

  const settings = getSettings();
  const isEnabled = settings.recoveryWatchdog !== false;

  if (isEnabled) {
    startWatchdogLoop();
  }

  // Hook into Windows power and session events for instant recovery
  try {
    powerMonitor.on("resume", () => {
      console.log("[RecoveryWatchdog] System resumed from sleep. Verifying wallpaper...");
      setTimeout(() => verifyAndRecoverNow().catch(() => {}), 2000);
    });

    powerMonitor.on("unlock-screen", () => {
      console.log("[RecoveryWatchdog] Screen unlocked. Verifying wallpaper...");
      setTimeout(() => verifyAndRecoverNow().catch(() => {}), 1500);
    });
  } catch (err) {
    console.error("[RecoveryWatchdog] powerMonitor hook error:", err.message);
  }

  // Initial check after startup settles
  setTimeout(() => {
    verifyAndRecoverNow().catch(() => {});
  }, 5000);

  return getWatchdogStatus();
}

function setWatchdogEnabled(enabled) {
  const settings = getSettingsFn ? getSettingsFn() : {};
  settings.recoveryWatchdog = !!enabled;
  if (saveSettingsFn) {
    saveSettingsFn(settings);
  }

  if (enabled) {
    startWatchdogLoop();
    verifyAndRecoverNow().catch(() => {});
  } else {
    stopWatchdogLoop();
  }

  return getWatchdogStatus();
}

function getWatchdogStatus() {
  const settings = getSettingsFn ? getSettingsFn() : {};
  const isEnabled = settings.recoveryWatchdog !== false;
  const activeWallpaper = settings.activeWallpaper || "";

  return {
    enabled: isEnabled,
    activeWallpaper,
    currentWindowsWallpaper,
    lastChecked: lastCheckedTime,
    lastRecovered: lastRecoveredTime,
    recoveryCount,
    isMatching: isMatchingState,
    isRecovering,
    status: !isEnabled ? "disabled" : isRecovering ? "recovering" : "active"
  };
}

module.exports = {
  initWatchdog,
  getWatchdogStatus,
  setWatchdogEnabled,
  verifyAndRecoverNow
};

