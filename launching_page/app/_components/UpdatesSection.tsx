import { GitHubRelease, extractHighlights, formatDate } from "../_lib/githubReleases";

interface UpdatesSectionProps {
  releases: GitHubRelease[];
}

export default function UpdatesSection({ releases }: UpdatesSectionProps) {
  return (
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
                      <span
                        className="badge"
                        style={{
                          background: "var(--accent2)",
                          color: "white",
                          fontSize: 10,
                          padding: "2px 6px",
                          border: "none",
                        }}
                      >
                        Beta
                      </span>
                    )}
                  </div>
                  <div className="releaseMeta" style={{ marginTop: 4 }}>
                    {formatDate(r.published_at)}
                  </div>
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
  );
}
