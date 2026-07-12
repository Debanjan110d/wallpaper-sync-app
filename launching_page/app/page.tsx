import HeroDecryptedText from "./_components/HeroDecryptedText";
import TrackLink from "./_components/TrackLink";
import Image from "next/image";
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

export default async function HomePage() {
  let releases = [] as Awaited<ReturnType<typeof fetchReleases>>;
  let releasesError: string | null = null;

  try {
    releases = await fetchReleases();
  } catch (e: any) {
    releasesError = e?.message || "Failed to load releases";
  }

  const latest = releases[0] || null;
  const latestAsset = latest ? pickPrimaryAsset(latest.assets || []) : null;

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
                    <div style={{ fontWeight: 900, marginBottom: 10 }}>Latest release</div>

                    {latest ? (
                      <>
                        <div className="kpiRow">
                          <div className="kpi">
                            <div className="kpiLabel">Version</div>
                            <div className="kpiValue">{latest.tag_name}</div>
                          </div>
                          <div className="kpi">
                            <div className="kpiLabel">Published</div>
                            <div className="kpiValue">{formatDate(latest.published_at)}</div>
                          </div>
                        </div>

                        <div style={{ marginTop: 12, color: "var(--muted)", lineHeight: 1.55 }}>
                          {extractHighlights(latest.body, 3).map((h) => (
                            <div key={h} style={{ marginTop: 6 }}>
                              • {h}
                            </div>
                          ))}
                        </div>

                        <div className="actions" style={{ marginTop: 14 }}>
                          {latestAsset ? (
                            <TrackLink
                              className="btn btnPrimary"
                              href={latestAsset.browser_download_url}
                              analyticsEvent="download_click"
                            >
                              Download {latestAsset.name}
                            </TrackLink>
                          ) : (
                            <a className="btn btnPrimary" href={latest.html_url}>
                              Open release
                            </a>
                          )}
                          <a className="btn" href={latest.html_url}>
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
              Latest version + older versions, straight from GitHub Releases.
            </p>

            <div className="releaseList">
              <div className="releaseItem">
                <div className="releaseTop">
                  <div>
                    <div className="releaseName">Latest</div>
                    <div className="releaseMeta">
                      {latest ? `${latest.tag_name} · ${formatDate(latest.published_at)}` : "Loading…"}
                    </div>
                  </div>
                  <div>
                    {latest && latestAsset ? (
                      <TrackLink
                        className="btn btnPrimary"
                        href={latestAsset.browser_download_url}
                        analyticsEvent="download_click"
                      >
                        Download
                      </TrackLink>
                    ) : (
                      <a className="btn btnPrimary" href={getReleasePageUrl()}>
                        Releases
                      </a>
                    )}
                  </div>
                </div>

                {latest && latest.assets?.length ? (
                  <div className="assetList">
                    {latest.assets.slice(0, 3).map((a) => (
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

                <details className="details">
                  <summary>Older versions</summary>
                  <div style={{ marginTop: 10 }}>
                    {releases.length <= 1 ? (
                      <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                        No older stable versions found.
                      </div>
                    ) : (
                      <div className="releaseList">
                        {releases.slice(1, 10).map((r) => {
                          const a = pickPrimaryAsset(r.assets || []);
                          return (
                            <div className="releaseItem" key={r.id}>
                              <div className="releaseTop">
                                <div>
                                  <div className="releaseName">{r.tag_name}</div>
                                  <div className="releaseMeta">{formatDate(r.published_at)}</div>
                                </div>
                                <div>
                                  <a className="btn" href={r.html_url}>
                                    Notes
                                  </a>
                                  {a ? (
                                    <TrackLink
                                      className="btn btnPrimary"
                                      href={a.browser_download_url}
                                      analyticsEvent="download_click"
                                    >
                                      Download
                                    </TrackLink>
                                  ) : null}
                                </div>
                              </div>
                              <div className="releaseBody">
                                {extractHighlights(r.body, 3).map((h) => (
                                  <div key={h} style={{ marginTop: 6 }}>
                                    • {h}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted2)" }}>
                      Want every build? Browse the full list on{" "}
                      <a href={getReleasePageUrl()} style={{ textDecoration: "underline" }}>
                        GitHub Releases
                      </a>
                      .
                    </div>
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
                      <div className="releaseName">{r.tag_name}</div>
                      <div className="releaseMeta">{formatDate(r.published_at)}</div>
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
