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
        backdropFilter: "blur(8px)"
      }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "inherit" }}>
            <Image src="/logo.png" alt="Wallpaper Sync" width={34} height={34} />
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Wallpaper Sync</span>
          </Link>
          <nav style={{ display: "flex", gap: "1.5rem", fontSize: "0.9rem" }}>
            <Link href="/" style={{ color: "rgba(233, 238, 252, 0.72)", textDecoration: "none" }}>Home</Link>
            <Link href="/reviews" style={{ color: "rgba(233, 238, 252, 0.72)", textDecoration: "none" }}>Reviews</Link>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "4rem 1.5rem" }}>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 800, marginBottom: "0.5rem", letterSpacing: "-0.5px" }}>
          Documentation
        </h1>
        <p style={{ color: "rgba(233, 238, 252, 0.6)", fontSize: "1.1rem", marginBottom: "3rem" }}>
          Understand how Wallpaper Sync operates, how to configure the desktop client, and advanced offline features.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
          <section style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1rem", color: "#2b7bff" }}>
              1. Overview & Setup
            </h2>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)", marginBottom: "1rem" }}>
              Wallpaper Sync is a lightweight, open-source utility that runs in your Windows system tray. It automates loading desktop wallpapers from your local collection, keeps them organized in folders, and schedules changes based on user preferences.
            </p>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)" }}>
              To install, download the latest setup executable from the home page. Once launched, check the system tray on your taskbar to open the dashboard controls.
            </p>
          </section>

          <section style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1rem", color: "#2b7bff" }}>
              2. How Wallpapers Are Set
            </h2>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)", marginBottom: "1rem" }}>
              The client utilizes a hybrid wallpaper applying system designed for Windows stability:
            </p>
            <ul style={{ paddingLeft: "1.5rem", lineHeight: 1.8, color: "rgba(233, 238, 252, 0.8)" }}>
              <li>
                <strong>Primary Module:</strong> Executes a dynamic call importing native bindings to write wallpapers directly.
              </li>
              <li>
                <strong>Registry Fallback:</strong> If the primary method is blocked by system permissions, the client executes fallback registry commands to write the image path directly to control panel settings, restarting explorer.exe automatically to refresh the layout.
              </li>
            </ul>
          </section>

          <section style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1rem", color: "#2b7bff" }}>
              3. Offline-First Caching
            </h2>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)", marginBottom: "1rem" }}>
              The application maintains all organizational variables offline. Categories, collections, and tags created while disconnected are cached locally inside the user data directories.
            </p>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)" }}>
              Once connection is restored, a background queue pushes synchronization payloads to the remote server, updating data collections seamlessly.
            </p>
          </section>

          <section style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1rem", color: "#2b7bff" }}>
              4. Smart Slideshows
            </h2>
            <p style={{ lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)" }}>
              Configure rotation cycles to target specific collections or genres. You can shuffle playlists, play sequentially, select images at random, or filter by your Favorites tags checklist.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: "6rem",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "2rem 0",
        textAlign: "center",
        fontSize: "0.85rem",
        color: "rgba(233, 238, 252, 0.52)"
      }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1.5rem" }}>
          Wallpaper Sync - Open Source - Built by Debanjan Dutta
        </div>
      </footer>
    </div>
  );
}
