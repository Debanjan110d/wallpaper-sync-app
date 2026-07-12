"use client";

import { useState, useEffect, useMemo } from "react";

type AnalyticsSnapshot = {
  visitsTotal: number;
  downloadClicksTotal: number;
  updatedAt: string;
};

// CountUp animation helper using requestAnimationFrame
function CountUp({ end, duration = 1000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let frameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressRatio = Math.min(progress / duration, 1);
      // easeOutQuad
      const ease = progressRatio * (2 - progressRatio);
      setCount(Math.floor(ease * end));

      if (progress < duration) {
        frameId = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [end, duration]);

  return <>{count}</>;
}

const BOOT_STEPS = [
  { text: "[sys] connecting to analytics node...", delay: 200, progress: 25 },
  { text: "[network] establishing handshake protocol... ok", delay: 400, progress: 55 },
  { text: "[database] querying live snapshot from disk...", delay: 450, progress: 85 },
  { text: "[system] validation passed. launching dashboard...", delay: 200, progress: 100 },
];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [bootProgress, setBootProgress] = useState(0);

  // Fetch real analytics data
  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
      })
      .catch(() => {
        // Fallback default statistics if route fails (first run or serverless read-only disk)
        setStats({
          visitsTotal: 0,
          downloadClicksTotal: 0,
          updatedAt: new Date().toISOString(),
        });
      });
  }, []);

  // Run terminal booting sequence
  useEffect(() => {
    let currentStep = 0;
    let timeoutId: NodeJS.Timeout;

    const runStep = () => {
      if (currentStep < BOOT_STEPS.length) {
        const step = BOOT_STEPS[currentStep];
        setBootLines((prev) => [...prev, step.text]);
        setBootProgress(step.progress);
        currentStep++;
        timeoutId = setTimeout(runStep, step.delay);
      } else {
        // Leave the loader visible for a split second after completion for smooth transitions
        timeoutId = setTimeout(() => {
          setLoading(false);
        }, 350);
      }
    };

    runStep();
    return () => clearTimeout(timeoutId);
  }, []);

  // Derived stats calculations
  const { visits, downloads, conversionRate } = useMemo(() => {
    const v = stats?.visitsTotal || 0;
    const d = stats?.downloadClicksTotal || 0;
    const rate = v > 0 ? ((d / v) * 100).toFixed(1) : "0.0";
    return { visits: v, downloads: d, conversionRate: rate };
  }, [stats]);

  return (
    <div className="analytics-bg">
      <style dangerouslySetInnerHTML={{ __html: `
        .analytics-bg {
          min-height: 100vh;
          background: radial-gradient(circle at 50% 0%, #0d1117 0%, #07090e 100%);
          color: #c9d1d9;
          font-family: system-ui, -apple-system, sans-serif;
          position: relative;
          overflow-x: hidden;
          padding-bottom: 50px;
        }

        /* Loader Styles */
        .loader-container {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #07090e;
          z-index: 1000;
        }

        .terminal-box {
          width: min(500px, calc(100% - 32px));
          background: #0d1117;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          font-family: monospace;
          font-size: 13px;
          color: #58a6ff;
          line-height: 1.6;
        }

        .terminal-header {
          display: flex;
          gap: 6px;
          margin-bottom: 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 10px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .dot-red { background: #ff5f56; }
        .dot-yellow { background: #ffbd2e; }
        .dot-green { background: #27c93f; }

        .terminal-body {
          min-height: 110px;
        }

        .cursor {
          display: inline-block;
          width: 8px;
          height: 15px;
          background: #58a6ff;
          animation: blink 0.8s infinite;
          vertical-align: middle;
          margin-left: 4px;
        }

        @keyframes blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        .progress-bar-container {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
          margin-top: 15px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #58a6ff, #8a5bff);
          width: 0%;
          transition: width 0.1s linear;
        }

        /* Dashboard Styles */
        .dashboard-content {
          opacity: 0;
          transition: opacity 0.6s ease-out;
        }

        .dashboard-content.visible {
          opacity: 1;
        }

        .dashboard-grid-kpi {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
          margin-top: 20px;
        }

        @media (max-width: 900px) {
          .dashboard-grid-kpi {
            grid-template-columns: 1fr;
          }
        }

        .dashboard-card {
          background: rgba(13, 17, 23, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .dashboard-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .glow-blue:hover {
          border-color: rgba(88, 166, 255, 0.3);
          box-shadow: 0 10px 30px rgba(88, 166, 255, 0.08);
        }

        .glow-purple:hover {
          border-color: rgba(138, 91, 255, 0.3);
          box-shadow: 0 10px 30px rgba(138, 91, 255, 0.08);
        }

        .glow-emerald:hover {
          border-color: rgba(57, 219, 114, 0.3);
          box-shadow: 0 10px 30px rgba(57, 219, 114, 0.08);
        }

        .kpi-title {
          font-size: 13px;
          color: #8b949e;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
          letter-spacing: 0.5px;
        }

        .kpi-num {
          font-size: 40px;
          font-weight: 800;
          margin: 16px 0 8px;
          color: #f0f6fc;
        }

        .kpi-sub {
          font-size: 12px;
          color: #8b949e;
        }

        .nav-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #8b949e;
          font-size: 13px;
          text-decoration: none;
          transition: color 0.2s;
          margin-bottom: 20px;
        }

        .nav-back-btn:hover {
          color: #58a6ff;
        }
      ` }} />

      {/* Booting Loading Console */}
      {loading && (
        <div className="loader-container">
          <div className="terminal-box">
            <div className="terminal-header">
              <div className="dot dot-red" />
              <div className="dot dot-yellow" />
              <div className="dot dot-green" />
            </div>
            <div className="terminal-body">
              {bootLines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
              <div>
                <span className="cursor" />
              </div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${bootProgress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Panel */}
      <main className={`dashboard-content ${!loading ? "visible" : ""}`} style={{ padding: "40px 0" }}>
        <div className="container" style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
          
          <a href="/" className="nav-back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Launchpage
          </a>

          <div style={{ marginBottom: 30 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f0f6fc", margin: 0 }}>Analytics Dashboard</h1>
            <p style={{ color: "#8b949e", fontSize: 14, margin: "6px 0 0" }}>
              Live telemetry aggregated directly from database snapshots.
            </p>
          </div>

          {/* Row 1: KPI Cards */}
          <div className="dashboard-grid-kpi">
            <div className="dashboard-card glow-blue">
              <div className="kpi-title">
                <span>TOTAL VISITS</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </div>
              <div className="kpi-num">
                {!loading && <CountUp end={visits} />}
              </div>
              <div className="kpi-sub">
                Unique visits logged on page load
              </div>
            </div>

            <div className="dashboard-card glow-purple">
              <div className="kpi-title">
                <span>DOWNLOAD CLICKS</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a5bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </div>
              <div className="kpi-num">
                {!loading && <CountUp end={downloads} />}
              </div>
              <div className="kpi-sub">
                Total clicks tracked on installer links
              </div>
            </div>

            <div className="dashboard-card glow-emerald">
              <div className="kpi-title">
                <span>CONVERSION RATE</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#39db72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div className="kpi-num">
                {conversionRate}%
              </div>
              <div className="kpi-sub">
                Ratio of downloads to visits
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", color: "#8b949e", fontSize: 12, marginTop: 50 }}>
            <span>Database last synchronized: {stats?.updatedAt ? new Date(stats.updatedAt).toLocaleString() : "Never"}</span>
          </div>

        </div>
      </main>
    </div>
  );
}
