import Link from "next/link";
import Image from "next/image";

export default function DocsPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #05060a 0%, #07080c 60%, #060712 100%)",
      color: "#e9eefc",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif"
    }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "1rem 0",
        background: "rgba(5, 6, 10, 0.8)",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 10
      }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "inherit" }}>
            <Image src="/logo.png" alt="Wallpaper Sync" width={34} height={34} />
            <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>Wallpaper Sync</span>
          </Link>
          <nav style={{ display: "flex", gap: "1.5rem", fontSize: "0.9rem" }}>
            <Link href="/" style={{ color: "rgba(233, 238, 252, 0.72)", textDecoration: "none" }}>Home</Link>
            <Link href="/reviews" style={{ color: "rgba(233, 238, 252, 0.72)", textDecoration: "none" }}>Reviews</Link>
            <a href="https://github.com/Debanjan110d/wallpaper-sync-app" target="_blank" rel="noreferrer" style={{ color: "rgba(233, 238, 252, 0.72)", textDecoration: "none" }}>GitHub</a>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "4rem 1.5rem" }}>
        <div style={{ display: "inline-flex", background: "rgba(43, 123, 255, 0.1)", border: "1px solid rgba(43, 123, 255, 0.2)", color: "#4f8ef7", padding: "4px 12px", borderRadius: "100px", fontSize: "0.8rem", fontWeight: 600, marginBottom: "1rem" }}>
          Technical Guides
        </div>
        <h1 style={{ fontSize: "2.8rem", fontWeight: 800, marginBottom: "0.5rem", letterSpacing: "-0.5px", background: "linear-gradient(90deg, #fff, #4f8ef7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Documentation
        </h1>
        <p style={{ color: "rgba(233, 238, 252, 0.6)", fontSize: "1.1rem", marginBottom: "3rem", lineHeight: 1.5 }}>
          Understand how Wallpaper Sync operates, how the AI Metadata Engine organizes wallpapers, and how to utilize offline client search.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* Section 1 */}
          <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "16px", padding: "2.5rem", boxShadow: "0 4px 30px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "#4f8ef7", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.1rem", background: "rgba(79, 142, 247, 0.1)", padding: "4px 10px", borderRadius: "8px" }}>1</span>
              Overview & Installation
            </h2>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)", marginBottom: "1rem" }}>
              Wallpaper Sync is a lightweight, system-tray utility built with Electron for Windows. It rotates wallpapers from your local cache based on scheduled intervals, or automatically synchronizes a shared catalog from a central web database.
            </p>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)" }}>
              To get started, install the latest compiled executable from our homepage. On launch, the application registers in the Windows tray. Right-click the tray icon or open the double-click dashboard to customize folder sources.
            </p>
          </section>

          {/* Section 2 */}
          <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "16px", padding: "2.5rem", boxShadow: "0 4px 30px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "#4f8ef7", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.1rem", background: "rgba(79, 142, 247, 0.1)", padding: "4px 10px", borderRadius: "8px" }}>2</span>
              AI Metadata & Junction Collection Mapping
            </h2>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)", marginBottom: "1.2rem" }}>
              Our system runs a **Generate Once, Search Locally** pipeline. When an admin uploads a wallpaper, the Vercel API sends the image to Gemini to perform automatic indexing:
            </p>
            <ul style={{ paddingLeft: "1.5rem", lineHeight: 1.8, color: "rgba(233, 238, 252, 0.8)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <li>
                <strong>Many-to-Many Collections:</strong> Wallpapers are matched to multiple collections using a flexible junction table (<code>wallpaper_collections</code>). The matching engine scores candidates based on keyword profiles and weights (<code>collection_keywords</code>), allowing wallpapers to cross-reference multiple groupings cleanly.
              </li>
              <li>
                <strong>Visual Style & Mood:</strong> Classifies visual styling attributes (e.g. <em>Minimalist</em>, <em>3D Render</em>, <em>Cyberpunk</em>) and mood expressions to support deep tag filtering.
              </li>
              <li>
                <strong>Dominant Colors:</strong> Extracts color families (e.g., <em>Blue</em>, <em>Dark</em>) automatically, storing them directly on the wallpaper record.
              </li>
              <li>
                <strong>Confidence Metrics:</strong> Logs AI confidence scores and generation timestamps to manage automated migrations.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "16px", padding: "2.5rem", boxShadow: "0 4px 30px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "#4f8ef7", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.1rem", background: "rgba(79, 142, 247, 0.1)", padding: "4px 10px", borderRadius: "8px" }}>3</span>
              Offline-First Fuzzy Search
            </h2>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)", marginBottom: "1rem" }}>
              During client sync, the desktop app downloads categories, collections, tags, and AI attributes to a local cache file (`local_metadata.json`).
            </p>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)" }}>
              {"Fuzzy matching algorithms analyze search queries against the wallpaper original filename, style keywords, primary colors, category names, collection titles, and tag lists. This means search matches happen instantaneously without internet connectivity."}
            </p>
          </section>

          {/* Section 4 */}
          <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "16px", padding: "2.5rem", boxShadow: "0 4px 30px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "#4f8ef7", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.1rem", background: "rgba(79, 142, 247, 0.1)", padding: "4px 10px", borderRadius: "8px" }}>4</span>
              Troubleshooting & Registry Fallbacks
            </h2>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)", marginBottom: "1rem" }}>
              In cases where user administrative locks prevent the primary bindings from changing the background, Wallpaper Sync activates its registry fallback layer:
            </p>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)" }}>
              The application writes the file path directly to the Windows registry control panel key and restarts the Windows Shell (<code>explorer.exe</code>) in the background to force reload the desktop window without interrupting other programs.
            </p>
          </section>

          {/* Section 5 */}
          <section style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "16px", padding: "2.5rem", boxShadow: "0 4px 30px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "#4f8ef7", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.1rem", background: "rgba(79, 142, 247, 0.1)", padding: "4px 10px", borderRadius: "8px" }}>5</span>
              Technical Admin Tools & Bulk Updates
            </h2>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)", marginBottom: "1rem" }}>
              The Next.js management portal supports bulk operations for library scaling:
            </p>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)" }}>
              Administrators can select multiple wallpapers in a grid layout to execute batch metadata modifications, mapping them to collections or toggling tags simultaneously. Real-time visual progress feedback (progress bar indicators) has also been added to ensure visibility during large multi-image uploads.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: "6rem",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "2.5rem 0",
        textAlign: "center",
        fontSize: "0.85rem",
        color: "rgba(233, 238, 252, 0.42)"
      }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1.5rem" }}>
          Wallpaper Sync · Open Source Project · Built by Debanjan Dutta (c) 2026
        </div>
      </footer>
    </div>
  );
}
