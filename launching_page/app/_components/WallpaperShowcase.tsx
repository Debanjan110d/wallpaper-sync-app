"use client";

import { useState } from "react";
import { Download, Eye, Sparkles, X, Check, Filter } from "lucide-react";

interface ShowcaseItem {
  id: string;
  title: string;
  category: string;
  resolution: string;
  aspectRatio: string;
  tags: string[];
  colors: string[];
  imageUrl: string;
  source: string;
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: "sc-1",
    title: "Asta and Liebe: Destined Struggle",
    category: "Anime",
    resolution: "3840 × 2160 (4K)",
    aspectRatio: "16:9",
    tags: ["#Anime", "#BlackClover", "#DarkFantasy", "#Demon"],
    colors: ["#853953", "#2C2C2C"],
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop",
    source: "Community Curated",
  },
  {
    id: "sc-2",
    title: "Neo-Tokyo Cyberpunk Rain",
    category: "Cyberpunk",
    resolution: "3840 × 2160 (4K)",
    aspectRatio: "16:9",
    tags: ["#Cyberpunk", "#Neon", "#NightCity", "#Rain"],
    colors: ["#2b7bff", "#8a5bff"],
    imageUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=1200&auto=format&fit=crop",
    source: "AI Tagged 4K",
  },
  {
    id: "sc-3",
    title: "Lone Samurai Cherry Blossom",
    category: "Artistic",
    resolution: "3840 × 2160 (4K)",
    aspectRatio: "16:9",
    tags: ["#Samurai", "#Minimal", "#Blossom", "#Japan"],
    colors: ["#E89B5B", "#D46743"],
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
    source: "Artist Edition",
  },
  {
    id: "sc-4",
    title: "Interstellar Abyss Nebula",
    category: "Nature",
    resolution: "5120 × 2880 (5K)",
    aspectRatio: "16:9",
    tags: ["#Space", "#Nebula", "#Cosmic", "#AMOLED"],
    colors: ["#612D53", "#07080c"],
    imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop",
    source: "NASA High-Res",
  },
  {
    id: "sc-5",
    title: "Apex GT Nightfall Drift",
    category: "Vehicles",
    resolution: "3840 × 2160 (4K)",
    aspectRatio: "16:9",
    tags: ["#Supercar", "#Speed", "#GTR", "#Drift"],
    colors: ["#D46743", "#FFEAD3"],
    imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop",
    source: "Automotive 4K",
  },
  {
    id: "sc-6",
    title: "Nordic Minimalist Mountain Fog",
    category: "Nature",
    resolution: "3840 × 2160 (4K)",
    aspectRatio: "16:9",
    tags: ["#Minimalist", "#Mountain", "#Fog", "#Clean"],
    colors: ["#BFE7EA", "#2C2C2C"],
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop",
    source: "Landscape Pro",
  },
];

const CATEGORIES = ["All", "Anime", "Cyberpunk", "Artistic", "Nature", "Vehicles"];

export default function WallpaperShowcase() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeItem, setActiveItem] = useState<ShowcaseItem | null>(null);

  const filteredItems =
    selectedCategory === "All"
      ? SHOWCASE_ITEMS
      : SHOWCASE_ITEMS.filter((item) => item.category === selectedCategory);

  return (
    <section className="section" id="tour-showcase">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 2.5rem auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "100px",
              background: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              color: "#818cf8",
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: "0.8rem",
            }}
          >
            <Sparkles size={14} /> Curated Catalog Showcase
          </div>
          <h2 className="sectionTitle" style={{ marginBottom: "0.8rem" }}>
            Explore 4K Curated Wallpapers
          </h2>
          <p className="sectionSub">
            Every wallpaper is automatically tagged with visual aesthetics, mood keywords, and dominant color palettes via Gemini 2.5 Flash.
          </p>

          {/* Category Filter Pills */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "1.5rem",
            }}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "20px",
                    border: isSelected
                      ? "1px solid rgba(99, 102, 241, 0.8)"
                      : "1px solid rgba(255, 255, 255, 0.1)",
                    background: isSelected
                      ? "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)"
                      : "rgba(255, 255, 255, 0.05)",
                    color: isSelected ? "#ffffff" : "rgba(233, 238, 252, 0.75)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Wallpaper Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
            gap: "24px",
          }}
        >
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveItem(item)}
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
                e.currentTarget.style.boxShadow = "0 15px 35px rgba(0, 0, 0, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Wallpaper Preview Image */}
              <div
                style={{
                  height: "190px",
                  backgroundImage: `url(${item.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  position: "relative",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  padding: "10px",
                }}
              >
                <span
                  style={{
                    background: "rgba(0, 0, 0, 0.75)",
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "6px",
                    padding: "3px 8px",
                    color: "#fff",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                  }}
                >
                  {item.resolution}
                </span>

                <div style={{ display: "flex", gap: "4px" }}>
                  {item.colors.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: c,
                        border: "1px solid rgba(255, 255, 255, 0.5)",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Card Meta Info */}
              <div style={{ padding: "14px 16px" }}>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", margin: "0 0 8px 0" }}>
                  {item.title}
                </h4>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "4px",
                        padding: "2px 7px",
                        fontSize: "0.72rem",
                        color: "rgba(233, 238, 252, 0.75)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.78rem", color: "rgba(233, 238, 252, 0.5)" }}>
                    {item.source}
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "#818cf8",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Eye size={13} /> Quick Preview
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox Modal */}
        {activeItem && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(5, 7, 13, 0.85)",
              backdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1.5rem",
            }}
            onClick={() => setActiveItem(null)}
          >
            <div
              style={{
                background: "linear-gradient(180deg, #0d1222 0%, #0a0d18 100%)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "20px",
                maxWidth: "760px",
                width: "100%",
                overflow: "hidden",
                boxShadow: "0 25px 70px rgba(0,0,0,0.85)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  height: "380px",
                  backgroundImage: `url(${activeItem.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  position: "relative",
                  display: "flex",
                  justifyContent: "flex-end",
                  padding: "14px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  style={{
                    background: "rgba(0, 0, 0, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "50%",
                    width: "34px",
                    height: "34px",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: "1.8rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                      {activeItem.title}
                    </h3>
                    <p style={{ color: "rgba(233, 238, 252, 0.6)", fontSize: "0.88rem", marginTop: "4px" }}>
                      {activeItem.resolution} · Aspect Ratio {activeItem.aspectRatio} · {activeItem.category}
                    </p>
                  </div>

                  <a
                    href="#download"
                    onClick={() => setActiveItem(null)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 18px",
                      background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                      color: "#fff",
                      borderRadius: "10px",
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                    }}
                  >
                    <Download size={14} /> Get via Wallpaper Sync
                  </a>
                </div>

                <div style={{ marginTop: "14px" }}>
                  <div style={{ fontSize: "0.8rem", color: "rgba(233, 238, 252, 0.5)", marginBottom: "6px" }}>
                    AI Metadata Tags:
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {activeItem.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          background: "rgba(99, 102, 241, 0.15)",
                          border: "1px solid rgba(99, 102, 241, 0.3)",
                          color: "#c084fc",
                          borderRadius: "6px",
                          padding: "3px 10px",
                          fontSize: "0.78rem",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

