import HeroDecryptedText from "./HeroDecryptedText";
import TrackLink from "./TrackLink";
import {
  GitHubRelease,
  GitHubReleaseAsset,
  extractHighlights,
  formatDate,
  getReleasePageUrl,
} from "../_lib/githubReleases";

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
    <section className="hero">
      <div className="container">
        <div className="heroGrid">
          <div>
            <h1 className="hTitle">
              <span className="titleAccent">Wallpaper Sync</span>
              <br />
              <HeroDecryptedText text="your wallpapers, on autopilot." />
            </h1>
            <p className="hSub">
              A lightweight Windows tray app that rotates wallpapers from your local collection — and can
              optionally sync a shared collection from a server.
            </p>

            <div className="actions">
              <a className="btn btnPrimary" href="#download">
                Download latest
              </a>
              <a
                className="btn btnGhost"
                href="https://github.com/Debanjan110d/wallpaper-sync-app"
                target="_blank"
                rel="noreferrer"
              >
                View source
              </a>
            </div>

            <div style={{ marginTop: 18, color: "var(--muted2)", fontSize: 13, lineHeight: 1.5 }}>
              No accounts. No ads. Just wallpapers.
              <br />
              Built with Electron · Release artifacts from GitHub.
            </div>
          </div>

          <div className="heroCards">
            <div className="card">
              <div className="cardInner">
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Latest Release</div>

                {latestRelease ? (
                  <>
                    <div className="kpiRow">
                      <div className="kpi">
                        <div className="kpiLabel">Version</div>
                        <div className="kpiValue">{latestRelease.tag_name}</div>
                      </div>
                      <div className="kpi">
                        <div className="kpiLabel">Published</div>
                        <div className="kpiValue">{formatDate(latestRelease.published_at)}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, color: "var(--muted)", lineHeight: 1.55 }}>
                      {extractHighlights(latestRelease.body, 3).map((h) => (
                        <div key={h} style={{ marginTop: 6 }}>
                          • {h}
                        </div>
                      ))}
                    </div>

                    <div className="actions" style={{ marginTop: 14 }}>
                      {latestReleaseAsset ? (
                        <TrackLink
                          className="btn btnPrimary"
                          href={latestReleaseAsset.browser_download_url}
                          analyticsEvent="download_click"
                        >
                          Download {latestReleaseAsset.name}
                        </TrackLink>
                      ) : (
                        <a className="btn btnPrimary" href={latestRelease.html_url}>
                          Open release
                        </a>
                      )}
                      <a className="btn" href={latestRelease.html_url}>
                        Release notes
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                      {releasesError ? (
                        <>
                          Couldn’t load GitHub Releases right now.
                          <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted2)" }}>
                            {releasesError}
                          </div>
                        </>
                      ) : (
                        "No releases found yet."
                      )}
                    </div>
                    <div className="actions" style={{ marginTop: 14 }}>
                      <a className="btn btnPrimary" href={getReleasePageUrl()}>
                        View releases
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <div className="cardInner">
                <div style={{ fontWeight: 900, marginBottom: 10 }}>AI Metadata Engine</div>
                <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                  Every uploaded wallpaper is automatically analyzed by Gemini 2.5 Flash. It instantly maps tags, collections, styles, quality, and color families for offline-first catalog searches.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
