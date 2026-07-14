import HeroDecryptedText from "./_components/HeroDecryptedText";
import TrackLink from "./_components/TrackLink";
import Image from "next/image";
import Link from "next/link";
import BootTerminal from "./_components/BootTerminal";
import {
  extractHighlights,
  fetchReleases,
  formatBytes,
  formatDate,
  getReleasePageUrl,
  pickPrimaryAsset,
} from "./_lib/githubReleases";

import fs from "node:fs/promises";
import path from "node:path";

export const revalidate = 60; // Revalidate page data every 60 seconds

export default async function HomePage() {
  let releases = [] as Awaited<ReturnType<typeof fetchReleases>>;
  let releasesError: string | null = null;

  try {
    releases = await fetchReleases();
  } catch (e: any) {
    releasesError = e?.message || "Failed to load releases";
  }

  const latestRelease = releases[0] || null;
  const latestReleaseAsset = latestRelease ? pickPrimaryAsset(latestRelease.assets || []) : null;
  const olderReleases = releases.slice(1, 6);

  return (
    <>
      <BootTerminal />
      <header className="header">
        <div className="container">
          <div className="headerInner">
            <div className="brand">
              <Image src="/logo.png" alt="Wallpaper Sync" width={42} height={42} priority />
              <span className="brandText">Wallpaper Sync</span>
              <span className="badge">Windows · Open Source</span>
            </div>
            <nav className="nav navDesktop" aria-label="Primary">
              <a href="#features">Features</a>
              <a href="#download">Download</a>
              <a href="#updates">Updates</a>
              <Link href="/docs">Docs</Link>
              <Link href="/reviews">Reviews</Link>
              <a href="https://github.com/Debanjan110d/wallpaper-sync-app" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </nav>

            <details className="navMobile">
              <summary className="navMobileSummary">Menu</summary>
              <div className="navMobilePanel" role="navigation" aria-label="Primary">
                <a href="#features">Features</a>
                <a href="#download">Download</a>
                <a href="#updates">Updates</a>
                <Link href="/docs">Docs</Link>
                <Link href="/reviews">Reviews</Link>
                <a
                  href="https://github.com/Debanjan110d/wallpaper-sync-app"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main>
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
                  <a className="btn btnGhost" href="https://github.com/Debanjan110d/wallpaper-sync-app" target="_blank" rel="noreferrer">
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

        <hr className="hr" />

        <section className="section" id="features">
          <div className="container">
            <h2 className="sectionTitle">Features</h2>
            <p className="sectionSub">
              Everything you’d expect from a modern wallpaper utility — without bloat.
            </p>

            <div className="featureGrid">
              <div className="feature">
                <h3>Drag & drop</h3>
                <p>Add wallpapers instantly — no import wizards.</p>
              </div>
              <div className="feature">
                <h3>Auto-rotate</h3>
                <p>Set an interval and forget it. Your desktop stays fresh.</p>
              </div>
              <div className="feature">
                <h3>Tray-first</h3>
                <p>Runs quietly in the system tray; minimal background usage.</p>
              </div>
              <div className="feature">
                <h3>Optional sync</h3>
                <p>Point it at a server API and sync a shared wallpaper collection.</p>
              </div>
              <div className="feature">
                <h3>Update checks</h3>
                <p>Installed builds can check for updates and open the latest installer.</p>
              </div>
              <div className="feature">
                <h3>Open source</h3>
                <p>Transparent releases and changelog. Fork it, tweak it, ship it.</p>
              </div>
            </div>
          </div>
        </section>



        <hr className="hr" />

        <section className="section" id="download">
          <div className="container" style={{ maxWidth: "800px" }}>
            <h2 className="sectionTitle">Download Wallpaper Sync</h2>
            <p className="sectionSub">
              Get the latest installer for Windows. No account needed.
            </p>

            <div className="releaseItem stableCol" style={{ border: "1px solid var(--cardBorder)", background: "var(--card)", padding: "2rem", borderRadius: "var(--radius)" }}>
              {latestRelease ? (
                <>
                  <div className="releaseTop" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <div className="releaseName" style={{ fontSize: "1.5rem", color: "var(--accent)", fontWeight: 700 }}>
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
                    <div className="assetList" style={{ marginTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
                      <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>Available Artifacts:</div>
                      {latestRelease.assets.map((a) => (
                        <div className="asset" key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginTop: 4 }}>
                          <TrackLink href={a.browser_download_url} analyticsEvent="download_click" style={{ color: "var(--fg)", textDecoration: "underline" }}>
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
                    <div className="releaseBody" style={{ marginTop: "1.5rem", fontSize: "0.9rem", color: "var(--muted)", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
                      <strong style={{ display: "block", marginBottom: "0.5rem" }}>Release Highlights:</strong>
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

            {/* Older Releases List */}
            {olderReleases.length > 0 && (
              <details className="details" style={{ marginTop: "2rem", width: "100%" }}>
                <summary style={{ cursor: "pointer", padding: "10px", fontWeight: 600, color: "var(--accent)" }}>Older Versions</summary>
                <div style={{ marginTop: 15, display: "flex", flexDirection: "column", gap: 10 }}>
                  {olderReleases.map((r) => {
                    const a = pickPrimaryAsset(r.assets || []);
                    return (
                      <div className="releaseItem" key={r.id} style={{ padding: "12px 18px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div className="releaseName" style={{ fontSize: "1rem", fontWeight: 600 }}>{r.tag_name}</div>
                          <div className="releaseMeta" style={{ fontSize: "0.8rem", color: "var(--muted2)" }}>{formatDate(r.published_at)}</div>
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

        <hr className="hr" />

        <section className="section" id="updates">
          <div className="container">
            <h2 className="sectionTitle">Updates</h2>
            <p className="sectionSub">
              Automatically pulled from GitHub Releases — redeploy not required.
            </p>

            <div className="releaseList">
              {releases.slice(0, 5).map((r) => (
                <div className="releaseItem" key={r.id}>
                  <div className="releaseTop">
                    <div>
                      <div className="releaseName" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {r.tag_name} 
                        {r.prerelease && (
                          <span className="badge" style={{ background: "var(--accent2)", color: "white", fontSize: 10, padding: "2px 6px", border: "none" }}>Beta</span>
                        )}
                      </div>
                      <div className="releaseMeta" style={{ marginTop: 4 }}>{formatDate(r.published_at)}</div>
                    </div>
                    <div>
                      <a className="btn" href={r.html_url}>
                        Read more
                      </a>
                    </div>
                  </div>
                  <div className="releaseBody">
                    {extractHighlights(r.body, 4).map((h) => (
                      <div key={h} style={{ marginTop: 6 }}>
                        • {h}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="hr" />

        <section className="footer">
          <div className="container">
            <div>
              Built for Windows · Powered by GitHub Releases · Deployed on Vercel
            </div>
            <div style={{ marginTop: 10, fontSize: "0.85rem", color: "var(--muted2)", maxWidth: "600px", margin: "10px auto 0 auto", lineHeight: 1.5 }}>
              <strong>Disclaimer:</strong> The wallpapers cataloged or indexed in this app are not owned by the creator. They are sourced from public platforms like Instagram, Unsplash, or Pinterest. If you are the owner and would like them removed, please raise a GitHub issue or contact us via email at debanjangamedu@gmail.com.
            </div>
            <div style={{ marginTop: 12 }}>
              <a href="https://github.com/Debanjan110d/wallpaper-sync-app" target="_blank" rel="noreferrer">
                Source
              </a>
              {" · "}
              <a href={getReleasePageUrl()} target="_blank" rel="noreferrer">
                Releases
              </a>
              {" · "}
              <a href="https://github.com/Debanjan110d/wallpaper-sync-app/issues" target="_blank" rel="noreferrer">
                Issues
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
