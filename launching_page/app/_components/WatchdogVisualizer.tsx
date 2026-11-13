"use client";

import { useState } from "react";
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle2, Zap } from "lucide-react";

export default function WatchdogVisualizer() {
  const [simulationState, setSimulationState] = useState<"idle" | "detecting" | "recovering" | "restored">("idle");
  const [recoveryLog, setRecoveryLog] = useState<string[]>([
    "[Watchdog] Monitoring active wallpaper hash...",
    "[Watchdog] State: Nominal (CPU: 0.1% · Memory: 4.8MB)",
  ]);

  const runSimulation = () => {
    setSimulationState("detecting");
    setRecoveryLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ⚠️ Windows lockscreen reset detected! Desktop reverted to default wallpaper.`,
    ]);

    setTimeout(() => {
      setSimulationState("recovering");
      setRecoveryLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ⚡ Initiating silent recovery pipeline via Win32 SystemParametersInfoW...`,
      ]);

      setTimeout(() => {
        setSimulationState("restored");
        setRecoveryLog((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✅ Wallpaper successfully restored in 260ms! Zero user intervention required.`,
        ]);

        setTimeout(() => {
          setSimulationState("idle");
        }, 5000);
      }, 700);
    }, 600);
  };

  return (
    <section className="section" id="tour-watchdog">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 2.5rem auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "100px",
              background: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.25)",
              color: "#4ade80",
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: "0.8rem",
            }}
          >
            <ShieldCheck size={14} /> Patented Self-Healing Architecture
          </div>
          <h2 className="sectionTitle" style={{ marginBottom: "0.8rem" }}>
            The Recovery Watchdog
          </h2>
          <p className="sectionSub">
            Windows frequently resets custom wallpapers after system updates, sleep cycles, or theme changes. Wallpaper Sync runs a continuous, featherweight Watchdog that auto-heals your desktop in milliseconds.
          </p>
        </div>

        {/* 3-Step Interactive Architecture Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginBottom: "2.5rem",
          }}
        >
          <div
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "1.8rem",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <Zap size={22} />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
              1. Micro-Polling Watcher
            </h3>
            <p style={{ color: "rgba(233, 238, 252, 0.72)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Runs a lightweight polling timer in background checking the active Windows wallpaper registry key every 3 seconds. Consumes less than 0.1% CPU.
            </p>
          </div>

          <div
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "1.8rem",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(245, 158, 11, 0.15)",
                color: "#fbbf24",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <AlertCircle size={22} />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
              2. Mismatch Detection
            </h3>
            <p style={{ color: "rgba(233, 238, 252, 0.72)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              If Windows replaces the background with default <code>img0.jpg</code> or another process intervenes, Watchdog immediately intercepts the mismatch.
            </p>
          </div>

          <div
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "1.8rem",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(34, 197, 94, 0.15)",
                color: "#4ade80",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
              3. Silent Auto-Healing
            </h3>
            <p style={{ color: "rgba(233, 238, 252, 0.72)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Restores your designated 4K wallpaper instantly without flickering or interrupting running full-screen games or video calls.
            </p>
          </div>
        </div>

        {/* Live Interactive Watchdog Simulation Box */}
        <div
          style={{
            background: "rgba(10, 14, 26, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "18px",
            padding: "1.8rem",
            maxWidth: "880px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              paddingBottom: "1rem",
              marginBottom: "1.2rem",
            }}
          >
            <div>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                Live Simulation Console
              </span>
              <h4 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fff", margin: "2px 0 0 0" }}>
                Status:{" "}
                <span
                  style={{
                    color:
                      simulationState === "detecting"
                        ? "#f59e0b"
                        : simulationState === "recovering"
                        ? "#60a5fa"
                        : simulationState === "restored"
                        ? "#4ade80"
                        : "#94a3b8",
                  }}
                >
                  {simulationState === "idle" && "🟢 Active & Monitoring"}
                  {simulationState === "detecting" && "🟡 Mismatch Detected"}
                  {simulationState === "recovering" && "🔵 Auto-Recovering Wallpaper..."}
                  {simulationState === "restored" && "🟢 Successfully Restored"}
                </span>
              </h4>
            </div>

            <button
              type="button"
              onClick={runSimulation}
              disabled={simulationState !== "idle"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                background:
                  simulationState === "idle"
                    ? "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)"
                    : "rgba(255, 255, 255, 0.08)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.86rem",
                cursor: simulationState === "idle" ? "pointer" : "not-allowed",
                boxShadow: simulationState === "idle" ? "0 4px 15px rgba(99, 102, 241, 0.4)" : "none",
              }}
            >
              <RefreshCw size={14} className={simulationState !== "idle" ? "animate-spin" : ""} />
              {simulationState === "idle" ? "Simulate Windows Reset" : "Simulating..."}
            </button>
          </div>

          {/* Terminal log output */}
          <div
            style={{
              background: "#030712",
              borderRadius: "10px",
              padding: "14px",
              fontFamily: "monospace",
              fontSize: "0.82rem",
              lineHeight: 1.7,
              maxHeight: "130px",
              overflowY: "auto",
              color: "#38bdf8",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            {recoveryLog.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
