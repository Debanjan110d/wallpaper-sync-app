const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const { app } = require("electron");

let logFilePath = null;

function getLogFilePath() {
  if (!logFilePath) {
    try {
      const userDataDir = app.getPath("userData");
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      logFilePath = path.join(userDataDir, "diagnostics.log");
    } catch {
      logFilePath = path.join(__dirname, "diagnostics.log");
    }
  }
  return logFilePath;
}

/**
 * Sanitize error messages and stacks to strip sensitive personal user paths,
 * tokens, and secrets before logging or transmission.
 */
function sanitizeText(raw) {
  if (!raw) return "";
  let str = typeof raw === "string" ? raw : String(raw);

  // Replace Windows user profile paths: C:\Users\<username>\ -> C:\Users\<user>\
  str = str.replace(/([a-zA-Z]:\\Users\\)[^\\]+(\\)/gi, "$1<user>$2");
  str = str.replace(/(\/Users\/|\/home\/)[^\/]+(\/)/gi, "$1<user>$2");

  // Redact sync tokens or auth keys
  str = str.replace(/x-sync-token[:=]\s*["']?[^"'\s,]+["']?/gi, "x-sync-token: [REDACTED]");
  str = str.replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, "bearer [REDACTED]");

  return str;
}

/**
 * Append a sanitized problem/error record to the local diagnostics log.
 */
function logProblem(category = "general", message = "", errorOrStack = null) {
  try {
    const file = getLogFilePath();
    const timestamp = new Date().toISOString();
    const cleanMsg = sanitizeText(message);
    let cleanStack = "";

    if (errorOrStack) {
      if (typeof errorOrStack === "object" && errorOrStack.stack) {
        cleanStack = sanitizeText(errorOrStack.stack);
      } else {
        cleanStack = sanitizeText(String(errorOrStack));
      }
    }

    const logEntry = `[${timestamp}] [${category.toUpperCase()}] ${cleanMsg}${cleanStack ? " | " + cleanStack.replace(/\r?\n/g, " -> ") : ""}\n`;

    fs.appendFileSync(file, logEntry, "utf-8");

    // Rotate log if it exceeds 500 KB (keep the latest 250 KB)
    try {
      const stats = fs.statSync(file);
      if (stats.size > 500 * 1024) {
        const content = fs.readFileSync(file, "utf-8");
        const half = content.slice(content.length - 250 * 1024);
        fs.writeFileSync(file, "[...truncated older logs...]\n" + half, "utf-8");
      }
    } catch {}
  } catch (err) {
    console.error("[diagnostics] Failed to write to local log:", err.message);
  }
}

/**
 * Retrieve summary of the local diagnostics log.
 */
function getDiagnosticsSummary() {
  try {
    const file = getLogFilePath();
    if (!fs.existsSync(file)) {
      return { totalLines: 0, sizeBytes: 0, recentLogs: [] };
    }
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    return {
      totalLines: lines.length,
      sizeBytes: Buffer.byteLength(content, "utf-8"),
      recentLogs: lines.slice(-50),
    };
  } catch {
    return { totalLines: 0, sizeBytes: 0, recentLogs: [] };
  }
}

/**
 * Clear local diagnostics log.
 */
function clearDiagnosticsLogs() {
  try {
    const file = getLogFilePath();
    if (fs.existsSync(file)) {
      fs.writeFileSync(file, "", "utf-8");
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Weekly Telemetry Check:
 * If the user explicitly opted-in (settings.telemetryEnabled === true)
 * and 7 days have elapsed since the last transmission, submit anonymous logs to the developer server.
 */
async function maybeSendWeeklyDiagnostics(settings, saveSettingsFn, getSyncConfigFn) {
  // STRICT PRIVACY GUARD: Never send telemetry unless user explicitly opted in!
  if (!settings || settings.telemetryEnabled !== true) {
    return false;
  }

  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const lastSent = Number(settings.lastTelemetrySent || 0);

  if (now - lastSent < ONE_WEEK_MS) {
    return false;
  }

  try {
    const file = getLogFilePath();
    if (!fs.existsSync(file)) {
      settings.lastTelemetrySent = now;
      if (typeof saveSettingsFn === "function") saveSettingsFn(settings);
      return false;
    }

    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      settings.lastTelemetrySent = now;
      if (typeof saveSettingsFn === "function") saveSettingsFn(settings);
      return false;
    }

    const syncConfig = typeof getSyncConfigFn === "function" ? getSyncConfigFn() : {};
    let apiUrl = syncConfig.API_URL || "https://wallpaper-sync-app.vercel.app/api/wallpapers";
    if (apiUrl.endsWith("/api/wallpapers")) {
      apiUrl = apiUrl.substring(0, apiUrl.length - "/api/wallpapers".length);
    }
    if (apiUrl.endsWith("/")) apiUrl = apiUrl.slice(0, -1);

    const targetUrl = `${apiUrl}/api/diagnostics`;

    const payload = {
      appVersion: app.getVersion(),
      osPlatform: process.platform,
      osRelease: os.release(),
      arch: process.arch,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
      errorCount: lines.length,
      logs: lines.slice(-100).join("\n"),
      submittedAt: new Date().toISOString(),
    };

    const headers = { "Content-Type": "application/json" };
    if (syncConfig.SYNC_TOKEN) {
      headers["x-sync-token"] = syncConfig.SYNC_TOKEN;
    }

    console.log(`[diagnostics] Submitting weekly anonymous diagnostic report (${lines.length} lines)...`);
    const res = await axios.post(targetUrl, payload, { headers, timeout: 15_000 });

    if (res.status >= 200 && res.status < 300) {
      console.log("[diagnostics] Weekly diagnostic report submitted successfully.");
      settings.lastTelemetrySent = now;
      if (typeof saveSettingsFn === "function") saveSettingsFn(settings);
      // Clean reported logs to avoid duplicate reporting next week
      clearDiagnosticsLogs();
      return true;
    }
  } catch (err) {
    console.warn("[diagnostics] Weekly telemetry submission notice:", err.message);
  }

  return false;
}

/**
 * Initialize global process handlers to intercept uncaught errors and record them.
 */
function initDiagnosticsLogger(settings, saveSettingsFn, getSyncConfigFn) {
  process.on("unhandledRejection", (reason) => {
    const msg = reason && reason.message ? reason.message : String(reason);
    const stack = reason && reason.stack ? reason.stack : "";
    logProblem("promise", `Unhandled Rejection: ${msg}`, stack);
  });

  process.on("uncaughtException", (error) => {
    const msg = error && error.message ? error.message : String(error);
    const stack = error && error.stack ? error.stack : "";
    logProblem("crash", `Uncaught Exception: ${msg}`, stack);
  });

  // Evaluate weekly telemetry 12 seconds after launch to avoid competing with startup
  setTimeout(() => {
    maybeSendWeeklyDiagnostics(settings, saveSettingsFn, getSyncConfigFn);
  }, 12_000);
}

module.exports = {
  logProblem,
  getDiagnosticsSummary,
  clearDiagnosticsLogs,
  maybeSendWeeklyDiagnostics,
  initDiagnosticsLogger,
};
