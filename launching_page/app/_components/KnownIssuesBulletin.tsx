"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, Clock, ExternalLink, HelpCircle, Sparkles } from "lucide-react";
import BugReportModal from "./BugReportModal";

export default function KnownIssuesBulletin() {
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [copiedWorkaround, setCopiedWorkaround] = useState(false);

  const copyWorkaround = () => {
    navigator.clipboard.writeText(
      "Wallpaper Sync v5.1.0 Workaround: In the right control studio, change Interval to '10 Seconds (Test)', then select your desired interval (e.g. 30 Minutes or 1 Hour). This immediately locks in the correct background timer."
    );
    setCopiedWorkaround(true);
    setTimeout(() => setCopiedWorkaround(false), 2000);
  };

  return (
    <section className="section" id="tour-bulletin" style={{ paddingTop: "1rem", paddingBottom: "2rem" }}>
      <div className="container" style={{ maxWidth: "1000px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(232, 155, 91, 0.12) 0%, rgba(97, 45, 83, 0.15) 100%)",
            border: "1px solid rgba(232, 155, 91, 0.35)",
            borderRadius: "20px",
            padding: "2rem",
            backdropFilter: "blur(16px)",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.35)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top Header Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "1.2rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(232, 155, 91, 0.25)",
                  color: "#E89B5B",
                  border: "1px solid rgba(232, 155, 91, 0.4)",
                  padding: "4px 12px",
                  borderRadius: "100px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                <AlertTriangle size={14} /> Active Notice & Known Quirks
              </span>
              <span style={{ fontSize: "0.85rem", color: "rgba(233, 238, 252, 0.6)" }}>
                Updated for v5.1.0
              </span>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setIsBugModalOpen(true)}
                style={{
                  padding: "6px 14px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fca5a5",
                  borderRadius: "10px",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "background 0.2s",
                }}
              >
                🐛 Report a Bug
              </button>
            </div>
          </div>

          {/* Bulletin Card Body */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "1.4rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "rgba(232, 155, 91, 0.2)",
                  border: "1px solid rgba(232, 155, 91, 0.3)",
                  color: "#E89B5B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "20px",
                }}
              >
                ⏱️
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                    Slideshow Interval Selector Default Initialization
                  </h4>
                  <span
                    style={{
                      background: "rgba(34, 197, 94, 0.15)",
                      color: "#4ade80",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                    }}
                  >
                    Fix Verified & Committed
                  </span>
                </div>

                <p
                  style={{
                    color: "rgba(233, 238, 252, 0.8)",
                    fontSize: "0.92rem",
                    lineHeight: 1.6,
                    marginTop: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <strong>What happens:</strong> In initial builds of v5.1.0, when you switch on the Slideshow toggle, the background timer loop may default to a 10-second test interval even if the dropdown displays <em>30 Minutes</em>.
                </p>

                {/* Instant Workaround Box */}
                <div
                  style={{
                    background: "rgba(232, 155, 91, 0.08)",
                    border: "1px dashed rgba(232, 155, 91, 0.4)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#E89B5B",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      marginBottom: "4px",
                    }}
                  >
                    <Sparkles size={14} /> 2-Second Quick Workaround:
                  </div>
                  <ol
                    style={{
                      margin: 0,
                      paddingLeft: "1.2rem",
                      color: "rgba(233, 238, 252, 0.88)",
                      fontSize: "0.88rem",
                      lineHeight: 1.6,
                    }}
                  >
                    <li>
                      Open the right <strong>Control Studio</strong> and locate the <strong>Interval</strong> dropdown.
                    </li>
                    <li>
                      Select <strong>&quot;10 Seconds (Test)&quot;</strong> once, then immediately re-select your preferred interval (e.g. <strong>30 Minutes</strong> or <strong>1 Hour</strong>).
                    </li>
                  </ol>
                  <div style={{ marginTop: "6px", fontSize: "0.82rem", color: "rgba(233, 238, 252, 0.65)" }}>
                    This triggers the event listener and immediately locks in your desired interval. The permanent hotfix has been pushed to our repository and will ship in the next automatic update!
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={copyWorkaround}
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "#e2e8f0",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {copiedWorkaround ? <CheckCircle size={14} color="#4ade80" /> : <Clock size={14} />}
                    {copiedWorkaround ? "Copied Workaround!" : "Copy Workaround"}
                  </button>

                  <a
                    href="https://github.com/Debanjan110d/wallpaper-sync-app/issues"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "#94a3b8",
                      fontSize: "0.82rem",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    View repository commits <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BugReportModal isOpen={isBugModalOpen} onClose={() => setIsBugModalOpen(false)} />
    </section>
  );
}
