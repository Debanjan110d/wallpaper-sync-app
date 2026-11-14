"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Play, Pause, Sun, Moon, Search, Sparkles, Check, ChevronRight } from "lucide-react";

interface RealWallpaper {
  id: string;
  name: string;
  collection: string;
  url: string;
  dominantColor: string;
  tags: string[];
}

const REAL_APP_WALLPAPERS: RealWallpaper[] = [
  {
    id: "asta-liebe",
    name: "Asta & Liebe: Destined",
    collection: "Anime Art",
    url: "https://ik.imagekit.io/k4rfr0svd/d868a20a2c7c197d4b1d830b4b80c1a9d38072e103ec6929917ed4dfc60a9394.jpg",
    dominantColor: "#853953",
    tags: ["#Anime", "#BlackClover", "#Demon"],
  },
  {
    id: "marvel-thor",
    name: "Thor: Love & Thunder",
    collection: "Marvel",
    url: "https://ik.imagekit.io/k4rfr0svd/14985a8a4371e4b45b63bf01695fc582b599689aa63de5e0212082a8e245094e.jpg",
    dominantColor: "#2b7bff",
    tags: ["#Marvel", "#Thor", "#Hero"],
  },
  {
    id: "calm-samurai",
    name: "Lone Samurai in Mist",
    collection: "Calm",
    url: "https://ik.imagekit.io/k4rfr0svd/9bbab7239b8b46ea30a1c33142721ddec148d02c5cc3bc0256f0245de53026d9.jpg",
    dominantColor: "#E89B5B",
    tags: ["#Minimalist", "#Samurai", "#Calm"],
  },
  {
    id: "messi-goat",
    name: "Leo Messi: Champion",
    collection: "Messi",
    url: "https://ik.imagekit.io/k4rfr0svd/0955d641e61e4e2e7641ba541d444a781afa3b6216a7cf27a3af1db0e5bbc43b.jpg",
    dominantColor: "#0ea5e9",
    tags: ["#Messi", "#GOAT", "#Football"],
  },
  {
    id: "attack-titan",
    name: "Eren & Levi: Final Battle",
    collection: "Attack on Titan",
    url: "https://ik.imagekit.io/k4rfr0svd/4d6d249369dbed0984542a22340bee58ef67527132ab07d8b0038d443b143ee8.jpg",
    dominantColor: "#b91c1c",
    tags: ["#Anime", "#Titan", "#Dark"],
  },
  {
    id: "interstellar-abyss",
    name: "Interstellar Gargantua",
    collection: "Interstellar",
    url: "https://ik.imagekit.io/k4rfr0svd/7c009a59a056633356b69b43acd24f2dffdad9cf3f872eaeef7ad0c0bbb984c8.jpg",
    dominantColor: "#612D53",
    tags: ["#Space", "#Cosmic", "#4K"],
  },
];

export default function AppStudioPreview() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isSlideshowRunning, setIsSlideshowRunning] = useState(true);
  const [isLightMode, setIsLightMode] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState("Home");

  // Slideshow auto-rotation timer in simulator
  useEffect(() => {
    if (!isSlideshowRunning) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % REAL_APP_WALLPAPERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isSlideshowRunning]);

  const currentWp = REAL_APP_WALLPAPERS[activeIdx];

  const themeBg = isLightMode ? "#FFEAD3" : "#2C2C2C";
  const surfaceBg = isLightMode ? "#FFFFFF" : "#612D53";
  const elevatedBg = isLightMode ? "#FFF6EC" : "#4A2340";
  const textColor = isLightMode ? "#2C2C2C" : "#F3F4F4";
  const mutedColor = isLightMode ? "rgba(44, 44, 44, 0.7)" : "rgba(243, 244, 244, 0.65)";
  const borderColor = isLightMode ? "rgba(212, 103, 67, 0.2)" : "rgba(243, 244, 244, 0.12)";
  const primaryColor = isLightMode ? "#D46743" : "#853953";

  return (
    <div
      id="tour-simulator"
      style={{
        background: themeBg,
        border: `1px solid ${borderColor}`,
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: `0 25px 70px rgba(0,0,0,0.7), 0 0 45px ${currentWp.dominantColor}40`,
        position: "relative",
        transition: "all 0.5s ease",
        color: textColor,
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      }}
    >
      {/* Windows App Title Bar */}
      <div
        style={{
          background: isLightMode ? "#F3E3D0" : "#1e1e24",
          padding: "8px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${borderColor}`,
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Image src="/logo.png" alt="App Icon" width={16} height={16} />
          <span style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "-0.2px" }}>
            Wallpaper Sync v5.1.0 — Desktop Wallpaper Manager
          </span>
        </div>

        {/* Top Controls: Mode Switch, Slideshow Status & Windows Window Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setIsSlideshowRunning(!isSlideshowRunning)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 9px",
              background: isSlideshowRunning ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.08)",
              border: isSlideshowRunning ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid rgba(255, 255, 255, 0.12)",
              color: isSlideshowRunning ? "#4ade80" : mutedColor,
              borderRadius: "6px",
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isSlideshowRunning ? <Pause size={10} /> : <Play size={10} />}
            {isSlideshowRunning ? "Slideshow: Active (4s)" : "Slideshow: Paused"}
          </button>

          <button
            type="button"
            onClick={() => setIsLightMode(!isLightMode)}
            style={{
              padding: "4px 8px",
              background: "rgba(255, 255, 255, 0.08)",
              border: `1px solid ${borderColor}`,
              color: isLightMode ? "#D46743" : "#F3F4F4",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            title="Toggle App Theme (Velvet Dark / Warm Light)"
          >
            {isLightMode ? <Sun size={12} /> : <Moon size={12} />}
          </button>

          <div style={{ display: "flex", gap: "8px", marginLeft: "6px", color: mutedColor, fontSize: "11px" }}>
            <span>─</span>
            <span>□</span>
            <span>✕</span>
          </div>
        </div>
      </div>

      {/* Main 3-Column Studio Body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "140px 1fr 180px",
          height: "360px",
          background: isLightMode
            ? `radial-gradient(ellipse at 50% 15%, ${currentWp.dominantColor}15 0%, transparent 70%), #FFEAD3`
            : `radial-gradient(ellipse at 50% 15%, ${currentWp.dominantColor}25 0%, transparent 70%), #2C2C2C`,
          transition: "background 0.8s ease",
        }}
      >
        {/* Column 1: Left Navigation Sidebar */}
        <div
          style={{
            background: surfaceBg,
            borderRight: `1px solid ${borderColor}`,
            padding: "12px 8px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 4px 10px 4px", borderBottom: `1px solid ${borderColor}`, marginBottom: "8px" }}>
              <Image src="/logo.png" alt="Wallpaper Sync" width={20} height={20} />
              <div style={{ fontSize: "0.78rem", fontWeight: 800 }}>Wallpaper Sync</div>
            </div>

            <nav style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {["Home", "Discover", "Collections", "Library (718)", "Favorites (2)"].map((item) => {
                const isItemActive = activeNavTab === item || (item.startsWith("Home") && activeNavTab === "Home");
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setActiveNavTab(item.split(" ")[0])}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      background: isItemActive ? primaryColor : "transparent",
                      color: isItemActive ? "#ffffff" : mutedColor,
                      border: "none",
                      fontSize: "0.74rem",
                      fontWeight: isItemActive ? 700 : 500,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{item}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div
            style={{
              padding: "6px",
              background: elevatedBg,
              borderRadius: "6px",
              fontSize: "0.68rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#4ade80",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80" }} />
            Connected · Synced
          </div>
        </div>

        {/* Column 2: Center Gallery & Quick Actions */}
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden" }}>
          {/* Top Search Mockup */}
          <div
            style={{
              background: surfaceBg,
              border: `1px solid ${borderColor}`,
              borderRadius: "8px",
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.75rem",
              color: mutedColor,
            }}
          >
            <Search size={12} />
            <span>Search wallpapers, collections, tags... (Ctrl+K)</span>
          </div>

          {/* Quick Action Pills */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
            {[
              { label: "Apply Random", icon: "⚡" },
              { label: "Start Slideshow", icon: "🔄" },
              { label: "Sync Library", icon: "📥" },
              { label: "Health Check", icon: "🔧" },
            ].map((qa, i) => (
              <div
                key={i}
                style={{
                  background: elevatedBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: "6px",
                  padding: "5px 6px",
                  textAlign: "center",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <div>{qa.icon}</div>
                <div style={{ fontSize: "0.65rem", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {qa.label}
                </div>
              </div>
            ))}
          </div>

          {/* Featured Real Wallpapers Horizontal Carousel */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.76rem", fontWeight: 700 }}>Recently Added Wallpapers:</span>
              <span style={{ fontSize: "0.68rem", color: primaryColor, fontWeight: 600 }}>Click to Apply →</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {REAL_APP_WALLPAPERS.slice(0, 6).map((wp, idx) => {
                const isSelected = idx === activeIdx;
                return (
                  <div
                    key={wp.id}
                    onClick={() => {
                      setActiveIdx(idx);
                      setIsSlideshowRunning(false);
                    }}
                    style={{
                      height: "76px",
                      borderRadius: "8px",
                      backgroundImage: `url(${wp.url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border: isSelected ? `2px solid ${primaryColor}` : `1px solid ${borderColor}`,
                      boxShadow: isSelected ? `0 0 12px ${currentWp.dominantColor}` : "none",
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                    title={wp.name}
                  >
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: "rgba(0,0,0,0.75)",
                        padding: "2px 4px",
                        fontSize: "0.62rem",
                        color: "#fff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {wp.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 3: Right Control Studio */}
        <div
          style={{
            background: surfaceBg,
            borderLeft: `1px solid ${borderColor}`,
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {/* Slideshow Control Box */}
          <div style={{ background: elevatedBg, border: `1px solid ${borderColor}`, borderRadius: "8px", padding: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700 }}>Slideshow</span>
              <span style={{ fontSize: "0.66rem", color: isSlideshowRunning ? "#4ade80" : mutedColor, fontWeight: 700 }}>
                {isSlideshowRunning ? "ON" : "OFF"}
              </span>
            </div>

            <div style={{ fontSize: "0.68rem", color: mutedColor, marginBottom: "4px" }}>
              Target: <strong>{currentWp.collection}</strong>
            </div>

            <div
              style={{
                background: themeBg,
                border: `1px solid ${borderColor}`,
                borderRadius: "4px",
                padding: "3px 6px",
                fontSize: "0.66rem",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Interval</span>
              <span><strong>30 Minutes</strong></span>
            </div>
          </div>

          {/* Now Playing Real Wallpaper Card with Adaptive Hue Glow */}
          <div
            style={{
              background: elevatedBg,
              border: `1px solid ${borderColor}`,
              borderRadius: "8px",
              padding: "8px",
              boxShadow: `0 4px 18px ${currentWp.dominantColor}50`,
              transition: "box-shadow 0.6s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", marginBottom: "6px" }}>
              <span style={{ fontWeight: 800, color: primaryColor }}>Now Playing</span>
              <span style={{ color: mutedColor }}>Active (4K)</span>
            </div>

            <div
              style={{
                height: "90px",
                borderRadius: "6px",
                backgroundImage: `url(${currentWp.url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                marginBottom: "6px",
                border: `1px solid ${borderColor}`,
              }}
            />

            <div style={{ fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentWp.name}
            </div>
            <div style={{ fontSize: "0.64rem", color: mutedColor }}>
              Collection: {currentWp.collection}
            </div>
          </div>

          {/* Watchdog Status Pill */}
          <div
            style={{
              background: elevatedBg,
              border: `1px solid ${borderColor}`,
              borderRadius: "6px",
              padding: "6px 8px",
              fontSize: "0.66rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🛡️</span>
            <div>
              <div style={{ fontWeight: 700 }}>Watchdog Active</div>
              <div style={{ color: mutedColor, fontSize: "0.6rem" }}>44.9 MB RAM · 0.1% CPU</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

