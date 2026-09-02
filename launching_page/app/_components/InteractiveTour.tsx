"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export default function InteractiveTour() {
  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(15, 17, 23, 0.85)",
      steps: [
        {
          element: "#tour-brand",
          popover: {
            title: "🚀 Welcome to Wallpaper Sync",
            description: "An open-source, high-performance 4K wallpaper sync app for Windows.",
            side: "bottom",
            align: "start"
          }
        },
        {
          element: "#tour-hero",
          popover: {
            title: "✨ Auto-Sync 4K Wallpapers",
            description: "Automatically download and sync curated wallpapers directly to your Windows desktop background.",
            side: "bottom",
            align: "center"
          }
        },
        {
          element: "#tour-download",
          popover: {
            title: "⚡ Download Windows Installer",
            description: "Get the latest signed executable installer compiled directly from GitHub release pipelines.",
            side: "top",
            align: "center"
          }
        },
        {
          element: "#tour-features",
          popover: {
            title: "🔥 Key Features & AI Indexer",
            description: "Powered by Gemini 2.5 Flash visual analysis, ImageKit CDN, and offline ETag caching.",
            side: "top",
            align: "center"
          }
        },
        {
          element: "#tour-updates",
          popover: {
            title: "📦 Live Release Updates",
            description: "Track latest version changelogs, assets, and update notes directly.",
            side: "top",
            align: "center"
          }
        }
      ]
    });

    driverObj.drive();
  };

  useEffect(() => {
    const hasSeen = localStorage.getItem("wallpaper_launch_tour_seen");
    if (!hasSeen) {
      const timer = setTimeout(() => {
        startTour();
        localStorage.setItem("wallpaper_launch_tour_seen", "true");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={startTour}
      className="tourBtn"
      style={{
        padding: "6px 14px",
        background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
        border: "none",
        borderRadius: "20px",
        color: "#ffffff",
        fontSize: "0.82rem",
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 0 15px rgba(99, 102, 241, 0.4)",
        transition: "transform 0.2s, box-shadow 0.2s",
        marginLeft: "8px"
      }}
    >
      ✨ Tour
    </button>
  );
}
