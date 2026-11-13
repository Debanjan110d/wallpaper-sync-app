"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Sparkles } from "lucide-react";

export default function InteractiveTour() {
  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      popoverClass: "driverjs-theme",
      overlayColor: "rgba(5, 7, 13, 0.88)",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Done ✨",
      steps: [
        {
          element: "#tour-brand",
          popover: {
            title: "🚀 Welcome to Wallpaper Sync",
            description: "An open-source, featherweight 4K desktop wallpaper utility engineered for Windows 10 & 11.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-simulator",
          popover: {
            title: "🖥️ Live Desktop Simulator",
            description: "Try out real-time wallpaper changing, test dark and light desktop themes, and preview slideshow rotation live on this page!",
            side: "left",
            align: "center",
          },
        },
        {
          element: "#tour-bulletin",
          popover: {
            title: "📢 Active Notice & Workarounds",
            description: "Transparent bulletin covering known issues (like the slideshow interval selector quirk) and providing instant 1-click bug reporting.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tour-showcase",
          popover: {
            title: "🖼️ Curated 4K Wallpaper Showcase",
            description: "Browse high-res wallpapers tagged by mood, resolution, and dominant RGB color palettes using Gemini 2.5 Flash.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tour-watchdog",
          popover: {
            title: "🛡️ Self-Healing Recovery Watchdog",
            description: "When Windows updates or restarts wipe your custom background, Watchdog catches it and auto-heals your desktop in under 300ms.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tour-download",
          popover: {
            title: "⚡ Instant Windows Installer",
            description: "Download the compiled executable installer directly from our verified GitHub release pipeline. Zero telemetry, zero ads.",
            side: "top",
            align: "center",
          },
        },
      ],
    });

    driverObj.drive();
  };

  useEffect(() => {
    const hasSeen = localStorage.getItem("wallpaper_launch_tour_v51");
    if (!hasSeen) {
      const timer = setTimeout(() => {
        startTour();
        localStorage.setItem("wallpaper_launch_tour_v51", "true");
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={startTour}
      className="tourBtn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 14px",
        background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
        border: "none",
        borderRadius: "20px",
        color: "#ffffff",
        fontSize: "0.82rem",
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 0 16px rgba(99, 102, 241, 0.4)",
        transition: "transform 0.2s, box-shadow 0.2s",
        marginLeft: "8px",
      }}
      title="Start guided onboarding walkthrough"
    >
      <Sparkles size={13} /> Tour
    </button>
  );
}
