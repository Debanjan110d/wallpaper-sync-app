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

  const stableReleases = releases.filter((r) => !r.prerelease);
  const betaReleases = releases.filter((r) => r.prerelease);

  const latestStable = stableReleases[0] || null;
  const latestStableAsset = latestStable ? pickPrimaryAsset(latestStable.assets || []) : null;

  const latestBeta = betaReleases[0] || null;
  const latestBetaAsset = latestBeta ? pickPrimaryAsset(latestBeta.assets || []) : null;

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
                    <div style={{ fontWeight: 900, marginBottom: 10 }}>Latest stable release</div>

                    {latestStable ? (
                      <>
                        <div className="kpiRow">
                          <div className="kpi">
                            <div className="kpiLabel">Version</div>
                            <div className="kpiValue">{latestStable.tag_name}</div>
                          </div>
                          <div className="kpi">
                            <div className="kpiLabel">Published</div>
                            <div className="kpiValue">{formatDate(latestStable.published_at)}</div>
                          </div>
                        </div>

                        <div style={{ marginTop: 12, color: "var(--muted)", lineHeight: 1.55 }}>
                          {extractHighlights(latestStable.body, 3).map((h) => (
                            <div key={h} style={{ marginTop: 6 }}>
                              • {h}
                            </div>
                          ))}
                        </div>

                        <div className="actions" style={{ marginTop: 14 }}>
                          {latestStableAsset ? (
                            <TrackLink
                              className="btn btnPrimary"
                              href={latestStableAsset.browser_download_url}
                              analyticsEvent="download_click"
                            >
                              Download {latestStableAsset.name}
                            </TrackLink>
                          ) : (
                            <a className="btn btnPrimary" href={latestStable.html_url}>
                              Open release
                            </a>
                          )}
                          <a className="btn" href={latestStable.html_url}>
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
                    <div style={{ fontWeight: 900, marginBottom: 10 }}>What it does</div>
                    <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                      Drag & drop wallpapers, rotate them on a schedule, run tray-only, and optionally keep a
                      shared collection synced.
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
          <div className="container">
            <h2 className="sectionTitle">Download</h2>
            <p className="sectionSub">
              Choose between our recommended Stable builds and experimental Beta/Pre-releases.
            </p>

            <div className="downloadGrid">
              {/* Stable Channel Column */}
              <div className="releaseItem stableCol">
                <div className="releaseTop">
                  <div>
                    <div className="releaseName" style={{ fontSize: "1.2rem", color: "var(--accent)" }}>Stable Release</div>
                    <div className="releaseMeta" style={{ marginTop: 4 }}>
                      {latestStable ? `${latestStable.tag_name} · ${formatDate(latestStable.published_at)}` : "No stable release found"}
                    </div>
                  </div>
                  <div>
                    {latestStable && latestStableAsset ? (
                      <TrackLink
                        className="btn btnPrimary"
                        href={latestStableAsset.browser_download_url}
                        analyticsEvent="download_click"
                      >
                        Download Stable
                      </TrackLink>
                    ) : (
                      <a className="btn btnPrimary" href={getReleasePageUrl()}>
                        Releases
                      </a>
                    )}
                  </div>
                </div>

                {latestStable && latestStable.assets?.length ? (
                  <div className="assetList" style={{ marginTop: "1rem" }}>
                    {latestStable.assets.slice(0, 3).map((a) => (
                      <div className="asset" key={a.id}>
                        <TrackLink href={a.browser_download_url} analyticsEvent="download_click">
                          {a.name}
                        </TrackLink>
                        <span>
                          {formatBytes(a.size)} · {a.download_count} downloads
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {latestStable && latestStable.body && (
                  <div className="releaseBody" style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                    <strong>Highlights:</strong>
                    {extractHighlights(latestStable.body, 3).map((h) => (
                      <div key={h} style={{ marginTop: 4 }}>
                        • {h}
                      </div>
                    ))}
                  </div>
                )}

                <details className="details" style={{ marginTop: "1.5rem" }}>
                  <summary>Older stable versions</summary>
                  <div style={{ marginTop: 10 }}>
                    {stableReleases.length <= 1 ? (
                      <div style={{ color: "var(--muted)", lineHeight: 1.6, fontSize: "0.85rem" }}>
                        No older stable versions found.
                      </div>
                    ) : (
                      <div className="releaseList" style={{ gap: 8 }}>
                        {stableReleases.slice(1, 5).map((r) => {
                          const a = pickPrimaryAsset(r.assets || []);
                          return (
                            <div className="releaseItem" key={r.id} style={{ padding: 10, background: "rgba(0,0,0,0.1)" }}>
                              <div className="releaseTop">
                                <div>
                                  <div className="releaseName" style={{ fontSize: "0.9rem" }}>{r.tag_name}</div>
                                  <div className="releaseMeta">{formatDate(r.published_at)}</div>
                                </div>
                                <div>
                                  {a ? (
                                    <TrackLink
                                      className="btn btnPrimary"
                                      href={a.browser_download_url}
                                      analyticsEvent="download_click"
                                      style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                    >
                                      Download
                                    </TrackLink>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </details>
              </div>

              {/* Beta Channel Column */}
              <div className="releaseItem betaCol">
                <div className="releaseTop">
                  <div>
                    <div className="releaseName" style={{ fontSize: "1.2rem", color: "var(--accent2)" }}>Beta Release (Pre-release)</div>
                    <div className="releaseMeta" style={{ marginTop: 4 }}>
                      {latestBeta ? `${latestBeta.tag_name} · ${formatDate(latestBeta.published_at)}` : "No beta release found"}
                    </div>
                  </div>
                  <div>
                    {latestBeta && latestBetaAsset ? (
                      <TrackLink
                        className="btn btnPrimary"
                        href={latestBetaAsset.browser_download_url}
                        analyticsEvent="download_click"
                        style={{ background: "var(--accent2)" }}
                      >
                        Download Beta
                      </TrackLink>
                    ) : (
                      <a className="btn" href={getReleasePageUrl()} style={{ opacity: 0.5, pointerEvents: "none" }}>
                        No Beta
                      </a>
                    )}
                  </div>
                </div>

                {latestBeta && latestBeta.assets?.length ? (
                  <div className="assetList" style={{ marginTop: "1rem" }}>
                    {latestBeta.assets.slice(0, 3).map((a) => (
                      <div className="asset" key={a.id}>
                        <TrackLink href={a.browser_download_url} analyticsEvent="download_click">
                          {a.name}
                        </TrackLink>
                        <span>
                          {formatBytes(a.size)} · {a.download_count} downloads
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {latestBeta && latestBeta.body && (
                  <div className="releaseBody" style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                    <strong>Beta Highlights:</strong>
                    {extractHighlights(latestBeta.body, 3).map((h) => (
                      <div key={h} style={{ marginTop: 4 }}>
                        • {h}
                      </div>
                    ))}
                  </div>
                )}

                <details className="details" style={{ marginTop: "1.5rem" }}>
                  <summary>Older beta versions</summary>
                  <div style={{ marginTop: 10 }}>
                    {betaReleases.length <= 1 ? (
                      <div style={{ color: "var(--muted)", lineHeight: 1.6, fontSize: "0.85rem" }}>
                        No older beta versions found.
                      </div>
                    ) : (
                      <div className="releaseList" style={{ gap: 8 }}>
                        {betaReleases.slice(1, 5).map((r) => {
                          const a = pickPrimaryAsset(r.assets || []);
                          return (
                            <div className="releaseItem" key={r.id} style={{ padding: 10, background: "rgba(0,0,0,0.1)" }}>
                              <div className="releaseTop">
                                <div>
                                  <div className="releaseName" style={{ fontSize: "0.9rem" }}>{r.tag_name}</div>
                                  <div className="releaseMeta">{formatDate(r.published_at)}</div>
                                </div>
                                <div>
                                  {a ? (
                                    <TrackLink
                                      className="btn"
                                      href={a.browser_download_url}
                                      analyticsEvent="download_click"
                                      style={{ padding: "4px 8px", fontSize: "0.75rem", background: "rgba(255,255,255,0.05)" }}
                                    >
                                      Download
                                    </TrackLink>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>
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
            <div style={{ marginTop: 10 }}>
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
