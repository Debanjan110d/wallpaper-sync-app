"use client";

import { useState, useEffect } from "react";
import { Play, Pause, ShieldCheck, Sun, Moon, Sparkles, RefreshCw } from "lucide-react";

interface WallpaperDemo {
  id: string;
  name: string;
  category: string;
  url: string;
  dominantColor: string;
}

const DEMO_WALLPAPERS: WallpaperDemo[] = [
  {
    id: "asta",
    name: "Asta & Liebe: Destined",
    category: "Anime & Fantasy",
    url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop",
    dominantColor: "#853953",
  },
  {
    id: "cyberpunk",
    name: "Neo-Tokyo Cyberpunk",
    category: "Sci-Fi & 3D",
    url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=1200&auto=format&fit=crop",
    dominantColor: "#2b7bff",
  },
  {
    id: "samurai",
    name: "Calm Samurai Rain",
    category: "Artistic & Minimal",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
    dominantColor: "#E89B5B",
  },
  {
    id: "cosmos",
    name: "Deep Cosmic AMOLED",
    category: "Space & Dark",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop",
    dominantColor: "#612D53",
  },
  {
    id: "supercar",
    name: "Night Supercar Drift",
    category: "Automotive",
    url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop",
    dominantColor: "#D46743",
  },
];

export default function DesktopSimulator() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isSlideshowRunning, setIsSlideshowRunning] = useState(true);
  const [isLightMode, setIsLightMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isWindowsResetting, setIsWindowsResetting] = useState(false);
  const [currentTime, setCurrentTime] = useState("12:00 PM");

  // Keep simulated desktop clock accurate
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Slideshow auto-rotation timer in simulator
  useEffect(() => {
    if (!isSlideshowRunning || isWindowsResetting) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % DEMO_WALLPAPERS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isSlideshowRunning, isWindowsResetting]);

  // Simulate Windows background reset and Watchdog auto-recovery
  const triggerWatchdogSimulation = () => {
    setIsWindowsResetting(true);
    setToastMessage("⚠️ Windows Reset: Desktop background overwritten!");

    setTimeout(() => {
      setIsWindowsResetting(false);
      setToastMessage("🛡️ Watchdog: Auto-recovered wallpaper in 280ms!");
      setTimeout(() => setToastMessage(null), 3500);
    }, 900);
  };

  const currentWallpaper = DEMO_WALLPAPERS[activeIdx];

  return (
    <div
      id="tour-simulator"
      style={{
        background: "rgba(15, 23, 42, 0.75)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 25px 70px rgba(0,0,0,0.7), 0 0 40px rgba(99, 102, 241, 0.2)",
        position: "relative",
      }}
    >
      {/* Simulator Window Header */}
      <div
        style={{
          background: isLightMode ? "#FFEAD3" : "rgba(10, 14, 26, 0.95)",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          transition: "background 0.3s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#f59e0b" }} />
          <div style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#10b981" }} />
          <span
            style={{
              marginLeft: "10px",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: isLightMode ? "#2C2C2C" : "rgba(233, 238, 252, 0.8)",
            }}
          >
            Windows Desktop Simulator · Live 4K Engine
          </span>
        </div>

        {/* Top Controls: Slideshow Toggle, Theme Switcher, Watchdog Sim */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setIsSlideshowRunning(!isSlideshowRunning)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              background: isSlideshowRunning ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.08)",
              border: isSlideshowRunning ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid rgba(255, 255, 255, 0.12)",
              color: isSlideshowRunning ? "#4ade80" : "rgba(233, 238, 252, 0.8)",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Toggle Simulator Slideshow"
          >
            {isSlideshowRunning ? <Pause size={12} /> : <Play size={12} />}
            {isSlideshowRunning ? "Slideshow: Active (4s)" : "Paused"}
          </button>

          <button
            type="button"
            onClick={() => setIsLightMode(!isLightMode)}
            style={{
              padding: "4px 8px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: isLightMode ? "#D46743" : "#f1f5f9",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            title="Toggle Windows Theme"
          >
            {isLightMode ? <Sun size={13} /> : <Moon size={13} />}
          </button>

          <button
            type="button"
            onClick={triggerWatchdogSimulation}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              color: "#c084fc",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Simulate Watchdog Recovery"
          >
            <ShieldCheck size={13} /> Simulate Reset
          </button>
        </div>
      </div>

      {/* Main Wallpaper Canvas */}
      <div
        style={{
          position: "relative",
          height: "330px",
          width: "100%",
          backgroundImage: isWindowsResetting
            ? "radial-gradient(circle, #0078d4 0%, #004e8c 100%)"
            : `url(${currentWallpaper.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "background-image 0.5s ease-in-out",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "16px",
        }}
      >
        {/* Desktop Icons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "70px" }}>
          <div style={{ textAlign: "center", cursor: "pointer" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                margin: "0 auto",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              💻
            </div>
            <span style={{ fontSize: "0.72rem", color: "#ffffff", textShadow: "0 1px 3px rgba(0,0,0,0.8)", fontWeight: 600 }}>
              This PC
            </span>
          </div>

          <div style={{ textAlign: "center", cursor: "pointer" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                margin: "0 auto",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              🌌
            </div>
            <span style={{ fontSize: "0.72rem", color: "#ffffff", textShadow: "0 1px 3px rgba(0,0,0,0.8)", fontWeight: 600 }}>
              Wallpaper Sync
            </span>
          </div>
        </div>

        {/* Watchdog Simulated Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: "absolute",
              bottom: "60px",
              right: "20px",
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(99, 102, 241, 0.5)",
              borderRadius: "12px",
              padding: "10px 16px",
              color: "#ffffff",
              fontSize: "0.84rem",
              fontWeight: 600,
              boxShadow: "0 10px 30px rgba(0,0,0,0.7), 0 0 20px rgba(99, 102, 241, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              animation: "fadeIn 0.3s ease",
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* Simulated Windows Taskbar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "42px",
            background: isLightMode ? "rgba(255, 234, 211, 0.85)" : "rgba(10, 14, 24, 0.88)",
            backdropFilter: "blur(16px)",
            borderTop: isLightMode ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255, 255, 255, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
            transition: "all 0.3s ease",
          }}
        >
          {/* Centered Start & App Pins */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 auto" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "rgba(0, 120, 212, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                cursor: "pointer",
              }}
              title="Windows Start"
            >
              🪟
            </div>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.5)",
                cursor: "pointer",
              }}
              title="Wallpaper Sync Running"
            >
              ✨
            </div>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
              }}
            >
              📁
            </div>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
              }}
            >
              🌐
            </div>
          </div>

          {/* Right System Tray & Clock */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: isLightMode ? "#2C2C2C" : "rgba(233, 238, 252, 0.8)",
              fontSize: "0.76rem",
              fontWeight: 600,
            }}
          >
            <span title="Wallpaper Sync Watchdog Active">🛡️</span>
            <span>📶</span>
            <span>🔊</span>
            <span>{currentTime}</span>
          </div>
        </div>
      </div>

      {/* Bottom Wallpaper Selection Chips */}
      <div
        style={{
          background: "rgba(10, 14, 26, 0.95)",
          padding: "12px 16px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          overflowX: "auto",
        }}
      >
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", whiteSpace: "nowrap" }}>
          Test Wallpapers:
        </span>
        <div style={{ display: "flex", gap: "8px", flex: 1 }}>
          {DEMO_WALLPAPERS.map((wp, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={wp.id}
                type="button"
                onClick={() => {
                  setActiveIdx(idx);
                  setIsSlideshowRunning(false);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "8px",
                  background: isActive
                    ? "linear-gradient(135deg, rgba(99, 102, 241, 0.35) 0%, rgba(168, 85, 247, 0.35) 100%)"
                    : "rgba(255, 255, 255, 0.05)",
                  border: isActive
                    ? "1px solid rgba(168, 85, 247, 0.6)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  color: isActive ? "#ffffff" : "rgba(233, 238, 252, 0.7)",
                  fontSize: "0.78rem",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: wp.dominantColor,
                  }}
                />
                {wp.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
