"use client";

import { useMemo, useState } from "react";

export type Screenshot = {
  src: string;
  alt: string;
};

export default function ScreenshotGrid({ screenshots }: { screenshots: Screenshot[] }) {
  const initial = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const s of screenshots) map[s.src] = true;
    return map;
  }, [screenshots]);

  const [visible, setVisible] = useState<Record<string, boolean>>(initial);

  const anyVisible = screenshots.some((s) => visible[s.src]);

  if (!anyVisible) {
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

  return (
    <div className="screensGrid">
      {screenshots.map((s) => (
        <div className="screenCard" key={s.src}>
          {visible[s.src] ? (
            <img
              className="screenImg"
              src={s.src}
              alt={s.alt}
              loading="lazy"
              onError={() => setVisible((prev) => ({ ...prev, [s.src]: false }))}
            />
          ) : (
            <div className="placeholder">
              <div>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Missing screenshot</div>
                <div style={{ lineHeight: 1.55 }}>{s.src}</div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
