import Image from "next/image";
import Link from "next/link";
import InteractiveTour from "./InteractiveTour";

export default function Header() {
  return (
    <header className="header" style={{ position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(16px)" }}>
      <div className="container">
        <div className="headerInner">
          <Link href="/" className="brand" id="tour-brand" style={{ textDecoration: "none", color: "inherit" }}>
            <Image src="/logo.png" alt="Wallpaper Sync" width={38} height={38} priority />
            <span className="brandText">Wallpaper Sync</span>
            <span className="badge">v5.1.0 · Win 10/11</span>
          </Link>

          <nav className="nav navDesktop" aria-label="Primary">
            <a href="/#tour-showcase">4K Showcase</a>
            <a href="/#tour-watchdog">Watchdog</a>
            <a href="/#features">Features</a>
            <Link href="/reviews">Reviews</Link>
            <Link href="/docs">Docs</Link>
            <a href="/#tour-bulletin" style={{ color: "#fca5a5" }} title="Report Bug or View Active Quirks">
              🐛 Report Bug
            </a>
            <a
              href="https://github.com/Debanjan110d/wallpaper-sync-app"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <InteractiveTour />
          </nav>

          <details className="navMobile">
            <summary className="navMobileSummary">Menu</summary>
            <div className="navMobilePanel" role="navigation" aria-label="Primary">
              <a href="/#tour-showcase">4K Showcase</a>
              <a href="/#tour-watchdog">Watchdog</a>
              <a href="/#features">Features</a>
              <a href="/#download">Download</a>
              <Link href="/reviews">Reviews</Link>
              <Link href="/docs">Docs</Link>
              <a href="/#tour-bulletin" style={{ color: "#fca5a5" }}>
                🐛 Report Bug
              </a>
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
  );
}
