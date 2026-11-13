import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BookOpen, Sparkles, Shield, Keyboard, AlertTriangle, RefreshCw, Terminal, CheckCircle2 } from "lucide-react";

export default function DocsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #05060a 0%, #07080c 50%, #060712 100%)",
        color: "#e9eefc",
        fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "1rem 0",
          background: "rgba(5, 6, 10, 0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            padding: "0 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Image src="/logo.png" alt="Wallpaper Sync" width={34} height={34} />
            <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>Wallpaper Sync</span>
            <span
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "#60a5fa",
                background: "rgba(59, 130, 246, 0.15)",
                padding: "2px 8px",
                borderRadius: "6px",
                border: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              Docs & Guide
            </span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: "1.5rem", fontSize: "0.9rem" }}>
            <Link
              href="/"
              style={{
                color: "rgba(233, 238, 252, 0.75)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <ArrowLeft size={14} /> Back to Home
            </Link>
            <Link href="/reviews" style={{ color: "rgba(233, 238, 252, 0.75)", textDecoration: "none" }}>
              Reviews
            </Link>
            <a
              href="https://github.com/Debanjan110d/wallpaper-sync-app"
              target="_blank"
              rel="noreferrer"
              style={{ color: "rgba(233, 238, 252, 0.75)", textDecoration: "none" }}
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "860px", margin: "0 auto", padding: "4rem 1.5rem" }}>
        {/* Intro Banner */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            color: "#60a5fa",
            padding: "4px 14px",
            borderRadius: "100px",
            fontSize: "0.82rem",
            fontWeight: 700,
            textTransform: "uppercase",
            marginBottom: "1rem",
          }}
        >
          <BookOpen size={14} /> The Friendly Guide to Wallpaper Sync
        </div>

        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 900,
            marginBottom: "0.8rem",
            letterSpacing: "-0.5px",
            lineHeight: 1.15,
          }}
        >
          Everything You Need to Know
        </h1>
        <p style={{ color: "rgba(233, 238, 252, 0.7)", fontSize: "1.15rem", marginBottom: "3rem", lineHeight: 1.6 }}>
          We built Wallpaper Sync because we wanted clean, gorgeous 4K wallpapers on our Windows desktops without giving up 800MB of RAM, sitting through ads, or setting up yet another account. Here&apos;s a quick, human walkthrough of how it all works.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {/* Section 1: Quickstart */}
          <section
            style={{
              background: "rgba(15, 23, 42, 0.55)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "2.2rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(99, 102, 241, 0.2)",
                  color: "#818cf8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                }}
              >
                1
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                Getting Started in 30 Seconds
              </h2>
            </div>
            <p style={{ lineHeight: 1.7, color: "rgba(233, 238, 252, 0.8)", marginBottom: "1rem" }}>
              Download the Windows installer from our homepage and run it. Wallpaper Sync sits quietly in your system tray on the bottom right of your Windows taskbar.
            </p>
            <ul style={{ paddingLeft: "1.3rem", lineHeight: 1.8, color: "rgba(233, 238, 252, 0.8)" }}>
              <li>
                <strong>Single Click on Tray:</strong> Cycles instantly to a fresh random 4K wallpaper.
              </li>
              <li>
                <strong>Double Click on Tray:</strong> Opens the full 3-column Control Studio dashboard where you can browse collections, configure slideshows, or tweak settings.
              </li>
              <li>
                <strong>Theme Switcher:</strong> Toggle between deep Velvet Dark Mode and warm Sunset Light Mode using the Sun/Moon button on top.
              </li>
            </ul>
          </section>

          {/* Section 2: Slideshow & Known Quirk Workaround */}
          <section
            style={{
              background: "linear-gradient(135deg, rgba(232, 155, 91, 0.1) 0%, rgba(97, 45, 83, 0.15) 100%)",
              border: "1px solid rgba(232, 155, 91, 0.35)",
              borderRadius: "20px",
              padding: "2.2rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(232, 155, 91, 0.25)",
                  color: "#E89B5B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                }}
              >
                2
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                Precision Slideshow & Interval Setting
              </h2>
            </div>
            <p style={{ lineHeight: 1.7, color: "rgba(233, 238, 252, 0.85)", marginBottom: "1rem" }}>
              In the right Control Studio, toggle the <strong>Slideshow switch</strong> to rotate wallpapers automatically. You can target <em>All Wallpapers</em>, your starred <em>Favorites</em>, or specific collections like <em>Anime Art</em> or <em>Calm</em>.
            </p>

            <div
              style={{
                background: "rgba(10, 14, 26, 0.75)",
                border: "1px dashed rgba(232, 155, 91, 0.5)",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#E89B5B", fontWeight: 700, fontSize: "0.95rem", marginBottom: "6px" }}>
                <AlertTriangle size={16} /> A Quick Note on v5.1.0 Timer Selection
              </div>
              <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.6, color: "rgba(233, 238, 252, 0.85)" }}>
                <strong>If your background rotates every 10 seconds:</strong> When you turn on Slideshow for the very first time, the background timer may default to a 10s test loop even though the dropdown visually reads 30m.
                <br /><br />
                <strong>The 2-second fix:</strong> In the <em>Interval</em> dropdown, pick <strong>10 Seconds (Test)</strong> once, then immediately re-select your preferred duration (e.g., <strong>30 Minutes</strong> or <strong>1 Hour</strong>). This synchronizes the background timer immediately.
              </p>
            </div>
          </section>

          {/* Section 3: Keyboard Shortcuts Cheatsheet */}
          <section
            style={{
              background: "rgba(15, 23, 42, 0.55)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "2.2rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(236, 72, 153, 0.2)",
                  color: "#f472b6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                }}
              >
                3
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                Desktop Keyboard Shortcuts
              </h2>
            </div>
            <p style={{ lineHeight: 1.7, color: "rgba(233, 238, 252, 0.8)", marginBottom: "1.2rem" }}>
              Wallpaper Sync is built for keyboard lovers. Control your background without ever touching a mouse:
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "12px",
              }}
            >
              {[
                { key: "Ctrl + K", desc: "Instant Search & Tag Filter" },
                { key: "Alt + S / Space", desc: "Play or Pause Slideshow" },
                { key: "Alt + N / →", desc: "Skip to Next Wallpaper" },
                { key: "Alt + R", desc: "Apply a Random Wallpaper" },
                { key: "Alt + F", desc: "Star / Favorite Active Wallpaper" },
                { key: "Ctrl + B", desc: "Toggle Left Navigation Sidebar" },
                { key: "Ctrl + Shift + B", desc: "Toggle Right Control Studio" },
                { key: "? or F1", desc: "Open Shortcuts Help Modal" },
              ].map((sc) => (
                <div
                  key={sc.key}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.86rem", color: "rgba(233, 238, 252, 0.8)" }}>{sc.desc}</span>
                  <code
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "6px",
                      padding: "2px 8px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {sc.key}
                  </code>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Self-Healing Watchdog */}
          <section
            style={{
              background: "rgba(15, 23, 42, 0.55)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "2.2rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(34, 197, 94, 0.2)",
                  color: "#4ade80",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                }}
              >
                4
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                Why Windows Resets Wallpapers (And the Watchdog Fix)
              </h2>
            </div>
            <p style={{ lineHeight: 1.7, color: "rgba(233, 238, 252, 0.8)", marginBottom: "1rem" }}>
              Have you ever locked your computer or woke it from sleep only to find your wallpaper was replaced by Windows default black or blue? That happens because Windows processes periodically reset the wallpaper registry key.
            </p>
            <p style={{ lineHeight: 1.7, color: "rgba(233, 238, 252, 0.8)" }}>
              Our <strong>Recovery Watchdog</strong> checks the active wallpaper hash every 3 seconds at a microscopic CPU footprint (less than 0.1%). If a mismatch is detected, it quietly reapplies your chosen wallpaper in ~280ms without interrupting your work.
            </p>
          </section>

          {/* Section 5: Gemini 2.5 Flash AI */}
          <section
            style={{
              background: "rgba(15, 23, 42, 0.55)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "2.2rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(168, 85, 247, 0.2)",
                  color: "#c084fc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                }}
              >
                5
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                AI Visual Tagging with Gemini 2.5 Flash
              </h2>
            </div>
            <p style={{ lineHeight: 1.7, color: "rgba(233, 238, 252, 0.8)" }}>
              We follow a strict <em>&quot;Generate Once, Search Locally&quot;</em> philosophy. When wallpapers are uploaded to our CDN, Gemini 2.5 Flash inspects each image once to extract subject matter, aesthetic mood, and dominant RGB color swatches. This metadata is saved directly to your local cache, so all your searches and filters run offline at blazing speed with 0ms network latency.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          marginTop: "6rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "2.5rem 0",
          textAlign: "center",
          fontSize: "0.85rem",
          color: "rgba(233, 238, 252, 0.52)",
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1.5rem" }}>
          Wallpaper Sync · Built with ❤️ by Debanjan Dutta · Open Source under MIT
        </div>
      </footer>
    </div>
  );
}
