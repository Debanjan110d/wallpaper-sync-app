import HeroDecryptedText from "./HeroDecryptedText";
import TrackLink from "./TrackLink";
import AppStudioPreview from "./AppStudioPreview";
import {
  GitHubRelease,
  GitHubReleaseAsset,
  extractHighlights,
  formatDate,
  getReleasePageUrl,
} from "../_lib/githubReleases";
import { Download, Sparkles, Shield, Cpu, ExternalLink } from "lucide-react";

interface HeroSectionProps {
  latestRelease: GitHubRelease | null;
  latestReleaseAsset: GitHubReleaseAsset | null;
  releasesError: string | null;
}

export default function HeroSection({
  latestRelease,
  latestReleaseAsset,
  releasesError,
}: HeroSectionProps) {
  return (
    <section className="hero" id="tour-hero">
      <div className="container">
        <div className="heroGrid" style={{ alignItems: "center" }}>
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "5px 14px",
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                borderRadius: "100px",
                color: "#c084fc",
                fontSize: "0.82rem",
                fontWeight: 700,
                marginBottom: "1.2rem",
              }}
            >
              <Sparkles size={14} />
              <span>v5.1.0 Released · Windows 10 & 11 (64-bit)</span>
            </div>

            <h1 className="hTitle" style={{ lineHeight: 1.15 }}>
              <span className="titleAccent">Wallpaper Sync</span>
              <br />
              <HeroDecryptedText text="your wallpapers, on autopilot." />
            </h1>

            <p className="hSub" style={{ fontSize: "1.08rem", lineHeight: 1.6, marginTop: "1rem" }}>
              An ultra-lightweight (~45MB RAM), distraction-free Windows tray utility with auto-rotation, self-healing background Watchdog, and Gemini 2.5 Flash visual intelligence.
            </p>

            <div className="actions" style={{ marginTop: "1.8rem" }}>
              {latestReleaseAsset ? (
                <TrackLink
                  className="btn btnPrimary"
                  href={latestReleaseAsset.browser_download_url}
                  analyticsEvent="download_click"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <Download size={16} /> Download {latestRelease?.tag_name || "v5.1.0"}
                </TrackLink>
              ) : (
                <a className="btn btnPrimary" href="#download" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <Download size={16} /> Download for Windows
                </a>
              )}

              <a
                className="btn btnGhost"
                href="https://github.com/Debanjan110d/wallpaper-sync-app"
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <ExternalLink size={16} /> GitHub Source
              </a>
            </div>

            {/* Micro Feature Pills */}
            <div
              style={{
                marginTop: "1.8rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                🛡️ Self-Healing Watchdog
              </span>
              <span>•</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                ⚡ ~45MB Idle RAM
              </span>
              <span>•</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                🚫 Zero Ads or Accounts
              </span>
            </div>
          </div>

          {/* Right Column: Live Wallpaper Sync Application Studio Preview */}
          <div className="heroCards">
            <AppStudioPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
