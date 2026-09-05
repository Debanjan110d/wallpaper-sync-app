import TrackLink from "./TrackLink";
import {
  GitHubRelease,
  GitHubReleaseAsset,
  extractHighlights,
  formatBytes,
  formatDate,
  pickPrimaryAsset,
} from "../_lib/githubReleases";

interface DownloadSectionProps {
  latestRelease: GitHubRelease | null;
  latestReleaseAsset: GitHubReleaseAsset | null;
  olderReleases: GitHubRelease[];
  releasesError: string | null;
}

export default function DownloadSection({
  latestRelease,
  latestReleaseAsset,
  olderReleases,
  releasesError,
}: DownloadSectionProps) {
  return (
    <section className="section" id="download">
      <div className="container" id="tour-download" style={{ maxWidth: "800px" }}>
        <h2 className="sectionTitle">Download Wallpaper Sync</h2>
        <p className="sectionSub">
          Get the latest installer for Windows. No account needed.
        </p>

        <div
          className="releaseItem stableCol"
          style={{
            border: "1px solid var(--cardBorder)",
            background: "var(--card)",
            padding: "2rem",
            borderRadius: "var(--radius)",
          }}
        >
          {latestRelease ? (
            <>
              <div
                className="releaseTop"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <div
                    className="releaseName"
                    style={{ fontSize: "1.5rem", color: "var(--accent)", fontWeight: 700 }}
                  >
                    Latest Version: {latestRelease.tag_name}
                  </div>
                  <div className="releaseMeta" style={{ marginTop: 4, color: "var(--muted)" }}>
                    Published on {formatDate(latestRelease.published_at)}
                  </div>
                </div>
                <div>
                  {latestReleaseAsset && (
                    <TrackLink
                      className="btn btnPrimary"
                      href={latestReleaseAsset.browser_download_url}
                      analyticsEvent="download_click"
                      style={{ padding: "12px 28px", fontSize: "1rem" }}
                    >
                      Download for Windows
                    </TrackLink>
                  )}
                </div>
              </div>

              {latestRelease.assets?.length ? (
                <div
                  className="assetList"
                  style={{
                    marginTop: "1.5rem",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    paddingTop: "1rem",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                    Available Artifacts:
                  </div>
                  {latestRelease.assets.map((a) => (
                    <div
                      className="asset"
                      key={a.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.85rem",
                        marginTop: 4,
                      }}
                    >
                      <TrackLink
                        href={a.browser_download_url}
                        analyticsEvent="download_click"
                        style={{ color: "var(--fg)", textDecoration: "underline" }}
                      >
                        {a.name}
                      </TrackLink>
                      <span style={{ color: "var(--muted2)" }}>
                        {formatBytes(a.size)} · {a.download_count} downloads
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {latestRelease.body && (
                <div
                  className="releaseBody"
                  style={{
                    marginTop: "1.5rem",
                    fontSize: "0.9rem",
                    color: "var(--muted)",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    paddingTop: "1rem",
                  }}
                >
                  <strong style={{ display: "block", marginBottom: "0.5rem" }}>
                    Release Highlights:
                  </strong>
                  {extractHighlights(latestRelease.body, 6).map((h) => (
                    <div key={h} style={{ marginTop: 4 }}>
                      • {h}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", color: "var(--muted)" }}>
              {releasesError || "No releases found."}
            </div>
          )}
        </div>

        {olderReleases.length > 0 && (
          <details className="details" style={{ marginTop: "2rem", width: "100%" }}>
            <summary
              style={{
                cursor: "pointer",
                padding: "10px",
                fontWeight: 600,
                color: "var(--accent)",
              }}
            >
              Older Versions
            </summary>
            <div style={{ marginTop: 15, display: "flex", flexDirection: "column", gap: 10 }}>
              {olderReleases.map((r) => {
                const a = pickPrimaryAsset(r.assets || []);
                return (
                  <div
                    className="releaseItem"
                    key={r.id}
                    style={{
                      padding: "12px 18px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div className="releaseName" style={{ fontSize: "1rem", fontWeight: 600 }}>
                        {r.tag_name}
                      </div>
                      <div className="releaseMeta" style={{ fontSize: "0.8rem", color: "var(--muted2)" }}>
                        {formatDate(r.published_at)}
                      </div>
                    </div>
                    <div>
                      {a ? (
                        <TrackLink
                          className="btn btnPrimary"
                          href={a.browser_download_url}
                          analyticsEvent="download_click"
                          style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                        >
                          Download
                        </TrackLink>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
