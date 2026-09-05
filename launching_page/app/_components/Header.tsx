import Image from "next/image";
import Link from "next/link";
import InteractiveTour from "./InteractiveTour";

export default function Header() {
  return (
    <header className="header">
      <div className="container">
        <div className="headerInner">
          <div className="brand" id="tour-brand">
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
  );
}
