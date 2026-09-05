import { getReleasePageUrl } from "../_lib/githubReleases";

export default function FooterSection() {
  return (
    <footer className="footer">
      <div className="container">
        <div>
          Built for Windows · Powered by GitHub Releases · Deployed on Vercel
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: "0.85rem",
            color: "var(--muted2)",
            maxWidth: "600px",
            margin: "10px auto 0 auto",
            lineHeight: 1.5,
          }}
        >
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
    </footer>
  );
}
