"use client";

import { Check, X, Shield, Sparkles } from "lucide-react";

export default function ComparisonTable() {
  const ROWS = [
    {
      feature: "Idle Background RAM Usage",
      ours: "~45 MB (Optimized v5.1)",
      theirs: "450 MB – 1 GB+",
      highlight: true,
    },
    {
      feature: "Telemetry, Trackers & Ads",
      ours: "Zero (100% Privacy)",
      theirs: "Ad networks & analytics",
      highlight: true,
    },
    {
      feature: "Self-Healing Recovery Watchdog",
      ours: "Yes (Restores in <300ms)",
      theirs: "No (Stays broken)",
      highlight: true,
    },
    {
      feature: "AI Visual Aesthetic Tagging",
      ours: "Gemini 2.5 Flash",
      theirs: "None / Manual keywords",
      highlight: false,
    },
    {
      feature: "Offline ETag Cache",
      ours: "Yes (Instant local launch)",
      theirs: "Cloud dependent",
      highlight: false,
    },
    {
      feature: "License & Open Source",
      ours: "100% Open Source (MIT)",
      theirs: "Closed source / Paywall",
      highlight: false,
    },
  ];

  return (
    <section className="section" id="comparison">
      <div className="container" style={{ maxWidth: "960px" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "100px",
              background: "rgba(139, 92, 246, 0.12)",
              border: "1px solid rgba(139, 92, 246, 0.25)",
              color: "#c084fc",
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: "0.8rem",
            }}
          >
            <Sparkles size={14} /> Transparent Benchmark
          </div>
          <h2 className="sectionTitle" style={{ marginBottom: "0.8rem" }}>
            Why Wallpaper Sync?
          </h2>
          <p className="sectionSub">
            Engineered from day one for extreme memory efficiency, zero distractions, and bulletproof background stability.
          </p>
        </div>

        <div
          style={{
            background: "rgba(15, 23, 42, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1.2fr 1fr",
              padding: "16px 24px",
              background: "rgba(10, 14, 26, 0.95)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              fontWeight: 700,
              fontSize: "0.88rem",
            }}
          >
            <span style={{ color: "rgba(233, 238, 252, 0.6)" }}>Capability / Feature</span>
            <span style={{ color: "#818cf8", display: "flex", alignItems: "center", gap: "6px" }}>
              ✨ Wallpaper Sync (v5.1.0)
            </span>
            <span style={{ color: "rgba(233, 238, 252, 0.5)" }}>Generic Wallpaper Apps</span>
          </div>

          <div>
            {ROWS.map((row, idx) => (
              <div
                key={row.feature}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1.2fr 1fr",
                  padding: "16px 24px",
                  borderBottom: idx === ROWS.length - 1 ? "none" : "1px solid rgba(255, 255, 255, 0.05)",
                  background: idx % 2 === 0 ? "rgba(255, 255, 255, 0.015)" : "transparent",
                  fontSize: "0.9rem",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#fff", fontWeight: 600 }}>{row.feature}</span>
                <span
                  style={{
                    color: "#4ade80",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Check size={16} /> {row.ours}
                </span>
                <span
                  style={{
                    color: "rgba(233, 238, 252, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <X size={15} color="#f87171" /> {row.theirs}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
