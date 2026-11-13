import { RefreshCw, Shield, Sparkles, Palette, Keyboard, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: RefreshCw,
    title: "Precision Slideshow",
    description: "Rotate wallpapers by custom intervals (10s to 24h). Filter by favorites, specific collections, or last 10 uploads.",
    color: "#3b82f6",
  },
  {
    icon: Shield,
    title: "Self-Healing Watchdog",
    description: "Monitors Windows background registry every 3 seconds. Silently auto-recovers your wallpaper if Windows or third-party apps reset it.",
    color: "#22c55e",
  },
  {
    icon: Sparkles,
    title: "Gemini 2.5 Flash Tagging",
    description: "Every cloud wallpaper is analyzed for mood, aesthetic genre, aspect ratio, and dominant RGB color swatches automatically.",
    color: "#a855f7",
  },
  {
    icon: Palette,
    title: "Dual Velvet Themes",
    description: "Beautifully styled in both warm Light mode (#FFEAD3/#E89B5B) and deep Velvet Dark mode (#2C2C2C/#853953).",
    color: "#f59e0b",
  },
  {
    icon: Keyboard,
    title: "Keyboard Shortcuts",
    description: "Full power-user workflow: Ctrl+K for search, Alt+S for slideshow, Alt+N for next, Alt+R for random, and Alt+F for favorites.",
    color: "#ec4899",
  },
  {
    icon: Zap,
    title: "Featherweight & Private",
    description: "Idles at just ~45MB RAM. 100% open-source under MIT, zero accounts needed, and zero background telemetry.",
    color: "#06b6d4",
  },
];

export default function FeaturesSection() {
  return (
    <section className="section" id="features">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 3rem auto" }}>
          <h2 className="sectionTitle">Engineered for Windows Enthusiasts</h2>
          <p className="sectionSub">
            Everything you’d expect from a world-class desktop utility — without the bloat, ads, or background CPU drain.
          </p>
        </div>

        <div className="featureGrid">
          {FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <div className="feature" key={item.title}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: `${item.color}20`,
                    border: `1px solid ${item.color}40`,
                    color: item.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "14px",
                  }}
                >
                  <Icon size={22} />
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>
                  {item.title}
                </h3>
                <p style={{ color: "rgba(233, 238, 252, 0.72)", fontSize: "0.92rem", lineHeight: 1.6 }}>
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
