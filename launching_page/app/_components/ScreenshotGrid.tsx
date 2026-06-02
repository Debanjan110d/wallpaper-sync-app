"use client";

import Masonry from "../../components/Masonry";

export type Screenshot = {
  src: string;
  alt: string;
};

export default function ScreenshotGrid({ screenshots }: { screenshots: Screenshot[] }) {
  if (screenshots.length === 0) {
    return (
      <div className="screensGrid">
        <div className="screenCard">
          <div className="placeholder">
            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Add screenshots</div>
              <div style={{ lineHeight: 1.55 }}>
                Drop images into{" "}
                <code style={{ color: "rgba(233,238,252,0.85)" }}>
                  /launching_page/public/screenshots
                </code>
                <br />
                Any filenames are fine (PNG/JPG/WebP/GIF).
              </div>
            </div>
          </div>
        </div>
        <div className="screenCard">
          <div className="placeholder">
            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>No images yet</div>
              <div style={{ lineHeight: 1.55 }}>
                Once you add screenshots, this grid will auto-fill.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const items = screenshots.map((s, idx) => ({
    id: String(idx),
    img: s.src,
    // No click-through by default; keeps UX consistent with the old grid.
    url: undefined
  }));

  return (
    <div style={{ marginTop: 18 }}>
      <Masonry
        items={items}
        ease="power3.out"
        duration={0.6}
        stagger={0.05}
        animateFrom="bottom"
        scaleOnHover
        hoverScale={0.98}
        blurToFocus
        colorShiftOnHover={false}
      />
    </div>
  );
}
