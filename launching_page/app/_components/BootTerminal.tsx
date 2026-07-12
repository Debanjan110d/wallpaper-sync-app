"use client";

import React, { useState, useEffect, useRef } from "react";

type BootStep = {
  text: string;
  delay: number;
  progress: number;
  artIndex: number;
};

const BOOT_STEPS: BootStep[] = [
  { text: "[system] initializing boot sequence...", delay: 200, progress: 10, artIndex: 0 },
  { text: "[core] mounting wallpaper sync service engine... ok", delay: 250, progress: 25, artIndex: 0 },
  { text: "[config] reading active profile settings (settings.json)...", delay: 280, progress: 40, artIndex: 1 },
  { text: "[display] active screens detected: primary [1920x1080], secondary [1440x900]", delay: 300, progress: 55, artIndex: 1 },
  { text: "[directory] scanning local wallpaper repository (42 files found)...", delay: 350, progress: 70, artIndex: 2 },
  { text: "[network] establishing connection with server repository...", delay: 400, progress: 85, artIndex: 3 },
  { text: "[sync] pulling remote image tags (8 updates available)... ok", delay: 350, progress: 95, artIndex: 3 },
  { text: "[graphics] desktop buffer pipeline synced. preparing UI...", delay: 200, progress: 100, artIndex: 4 },
];

const MONITOR_ASCII = (content: string) => `
     .-----------------------.
     |     WALLPAPER SYNC    |
     +-----------------------+
${content}
     '-----------------------'
                [ ]
             =========[_]
`;

const ASCII_WALLPAPERS = [
  // 0: Initializing
  `     |                       |
     |      INITIALIZING     |
     |                       |
     |        . . . .        |
     |                       |`,
  // 1: Display detected
  `     |  DISPLAY DETECTED:    |
     |     [MONITOR 1]       |
     |     [MONITOR 2]       |
     |   [x] 1920 x 1080     |
     |                       |`,
  // 2: Local Scan
  `     |   INDEXING LOCAL:     |
     |   /wallpapers/        |
     |   ├── sunset.jpg      |
     |   ├── neon_city.png   |
     |   └── cyberpunk.png   |`,
  // 3: Downloading
  `     |     DOWNLOADING...    |
     |    [█████████░░░] 75% |
     |    Speed: 4.2 MB/s    |
     |    Catalog update...  |
     |                       |`,
  // 4: Synced
  `     |    ▲         .   *    |
     |   / \\    ▲      .     |
     |  /   \\  / \\           |
     | /_____\\/___\\ [SYNCED] |
     |                       |`,
];

export default function BootTerminal() {
  const [loading, setLoading] = useState(true);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [bootProgress, setBootProgress] = useState(0);
  const [artIndex, setArtIndex] = useState(0);
  const [hasBypassed, setHasBypassed] = useState(false);

  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]);
  const termEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bootLines]);

  // Lock scroll
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [loading]);

  const triggerShutdown = (delay = 300) => {
    const tid = setTimeout(() => {
      setIsShuttingDown(true);
      // Wait for CRT shutdown animation to finish
      const endTid = setTimeout(() => {
        setLoading(false);
      }, 450);
      timeoutIdsRef.current.push(endTid);
    }, delay);
    timeoutIdsRef.current.push(tid);
  };

  const handleBypass = () => {
    if (hasBypassed || !loading || isShuttingDown) return;
    setHasBypassed(true);

    // Clear all scheduled steps
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];

    // Print bypass logs
    setBootLines((prev) => [
      ...prev,
      `[bypass] manual interrupt signal detected.`,
      `[override] skipping remainder of sync verification...`,
      `[system] launching landing interface...`,
    ]);
    setBootProgress(100);
    setArtIndex(4); // Switch to completed sync screen

    triggerShutdown(350);
  };

  // Keyboard shortcut listener for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleBypass();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, isShuttingDown, hasBypassed]);

  // Run boot sequence
  useEffect(() => {
    let currentStep = 0;
    let accumulatedDelay = 0;

    const runStep = (stepIndex: number) => {
      if (stepIndex >= BOOT_STEPS.length) {
        triggerShutdown(400);
        return;
      }

      const step = BOOT_STEPS[stepIndex];
      const tid = setTimeout(() => {
        setBootLines((prev) => [...prev, step.text]);
        setBootProgress(step.progress);
        setArtIndex(step.artIndex);
        runStep(stepIndex + 1);
      }, step.delay);

      timeoutIdsRef.current.push(tid);
    };

    // Small delay before starting boot sequence
    const initTid = setTimeout(() => {
      runStep(0);
    }, 150);
    timeoutIdsRef.current.push(initTid);

    return () => {
      timeoutIdsRef.current.forEach(clearTimeout);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className={`boot-overlay ${isShuttingDown ? "crt-shutdown" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .boot-overlay {
          position: fixed;
          inset: 0;
          background: #040508;
          color: #58a6ff;
          z-index: 99999;
          font-family: monospace;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 20px;
        }

        /* CRT Scanlines and flicker simulation */
        .boot-overlay::before {
          content: " ";
          display: block;
          position: absolute;
          inset: 0;
          background: linear-gradient(
            rgba(18, 16, 16, 0) 50%, 
            rgba(0, 0, 0, 0.3) 50%
          ), linear-gradient(
            90deg, 
            rgba(255, 0, 0, 0.05), 
            rgba(0, 255, 0, 0.02), 
            rgba(0, 0, 255, 0.05)
          );
          z-index: 100;
          background-size: 100% 4px, 6px 100%;
          pointer-events: none;
        }

        .crt-container {
          width: min(850px, 100%);
          background: #080a0f;
          border: 2px solid rgba(88, 166, 255, 0.25);
          border-radius: 12px;
          box-shadow: 0 0 40px rgba(88, 166, 255, 0.15), inset 0 0 20px rgba(0, 0, 0, 0.8);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          max-height: 85vh;
          animation: crt-flicker 0.15s infinite alternate;
        }

        .crt-header {
          background: rgba(88, 166, 255, 0.1);
          border-bottom: 1px solid rgba(88, 166, 255, 0.2);
          padding: 10px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .crt-title {
          font-size: 12px;
          font-weight: bold;
          letter-spacing: 1px;
          text-shadow: 0 0 5px rgba(88, 166, 255, 0.6);
        }

        .crt-dots {
          display: flex;
          gap: 6px;
        }

        .crt-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(88, 166, 255, 0.3);
        }

        .crt-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          flex: 1;
          overflow: hidden;
          min-height: 380px;
        }

        @media (max-width: 768px) {
          .crt-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto;
            overflow-y: auto;
          }
          .art-panel {
            border-left: none !important;
            border-top: 1px solid rgba(88, 166, 255, 0.15);
            padding: 20px 0 !important;
          }
        }

        .console-panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow-y: auto;
        }

        .console-log {
          flex: 1;
          font-size: 13px;
          line-height: 1.6;
          margin-bottom: 20px;
          color: #c9d1d9;
          text-shadow: 0 0 2px rgba(201, 209, 217, 0.4);
        }

        .console-line {
          margin-bottom: 6px;
          white-space: pre-wrap;
        }

        .console-line.system { color: #58a6ff; }
        .console-line.core { color: #ff7b72; }
        .console-line.config { color: #d2a8ff; }
        .console-line.display { color: #f2cc60; }
        .console-line.directory { color: #7ee787; }
        .console-line.network { color: #79c0ff; }
        .console-line.sync { color: #56d364; }
        .console-line.bypass { color: #ffa657; font-weight: bold; }

        .cursor {
          display: inline-block;
          width: 8px;
          height: 15px;
          background: #58a6ff;
          animation: blink 0.8s infinite;
          vertical-align: middle;
          margin-left: 6px;
          box-shadow: 0 0 5px rgba(88, 166, 255, 0.8);
        }

        .progress-section {
          border-top: 1px solid rgba(88, 166, 255, 0.15);
          padding-top: 16px;
        }

        .progress-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 8px;
          color: #8b949e;
        }

        .progress-bar {
          height: 6px;
          background: rgba(88, 166, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
          border: 1px solid rgba(88, 166, 255, 0.2);
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #58a6ff, #8a5bff);
          box-shadow: 0 0 10px rgba(88, 166, 255, 0.5);
          transition: width 0.15s ease-out;
        }

        .art-panel {
          padding: 24px;
          border-left: 1px solid rgba(88, 166, 255, 0.15);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);
        }

        .ascii-art {
          font-family: monospace;
          white-space: pre;
          font-size: 11px;
          line-height: 1.25;
          color: #7ee787;
          text-shadow: 0 0 4px rgba(126, 231, 135, 0.6);
        }

        .bypass-btn {
          margin-top: 20px;
          background: transparent;
          border: 1px solid rgba(88, 166, 255, 0.4);
          color: rgba(88, 166, 255, 0.8);
          padding: 6px 14px;
          font-size: 11px;
          font-family: monospace;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .bypass-btn:hover {
          background: rgba(88, 166, 255, 0.15);
          color: #58a6ff;
          border-color: #58a6ff;
          box-shadow: 0 0 10px rgba(88, 166, 255, 0.25);
        }

        /* CRT Screen Shutdown Effect */
        @keyframes crt-off {
          0% {
            transform: scale(1, 1);
            filter: brightness(1) contrast(1);
            opacity: 1;
          }
          30% {
            transform: scale(1, 0.008);
            filter: brightness(2) contrast(1.5);
            opacity: 1;
          }
          65% {
            transform: scale(0.008, 0.008);
            filter: brightness(6);
            opacity: 1;
          }
          100% {
            transform: scale(0, 0);
            filter: brightness(8);
            opacity: 0;
          }
        }

        .crt-shutdown {
          animation: crt-off 0.45s cubic-bezier(0.25, 1, 0.5, 1) forwards !important;
        }

        @keyframes crt-flicker {
          0% { opacity: 0.975; }
          50% { opacity: 1.0; }
          100% { opacity: 0.985; }
        }

        @keyframes blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      ` }} />

      <div className="crt-container">
        <div className="crt-header">
          <div className="crt-title">WALLPAPER-SYNC v1.4.0 - ESTABLISHING ENVIRONMENT</div>
          <div className="crt-dots">
            <div className="crt-dot" />
            <div className="crt-dot" />
            <div className="crt-dot" />
          </div>
        </div>

        <div className="crt-grid">
          {/* Console Logs Panel */}
          <div className="console-panel">
            <div className="console-log">
              {bootLines.map((line, idx) => {
                // Determine CSS class based on line prefix tag
                const tag = line.match(/^\[([a-z]+)\]/)?.[1] || "";
                return (
                  <div key={idx} className={`console-line ${tag}`}>
                    {line}
                  </div>
                );
              })}
              {!isShuttingDown && (
                <div>
                  <span className="cursor" />
                </div>
              )}
              <div ref={termEndRef} />
            </div>

            <div className="progress-section">
              <div className="progress-meta">
                <span>SYSTEM SYNC STATUS</span>
                <span>{bootProgress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${bootProgress}%` }} />
              </div>
            </div>
          </div>

          {/* ASCII Wallpaper Art Panel */}
          <div className="art-panel">
            <div className="ascii-art">
              {MONITOR_ASCII(ASCII_WALLPAPERS[artIndex])}
            </div>
            
            {!isShuttingDown && (
              <button className="bypass-btn" onClick={handleBypass}>
                [ BYPASS SYNC BOOT ]
              </button>
            )}
            
            <div style={{ marginTop: 12, fontSize: 10, color: "rgba(88, 166, 255, 0.4)" }}>
              {!isShuttingDown && "Press ESC to skip validation checks"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
