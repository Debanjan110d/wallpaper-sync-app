import { getAnalyticsSnapshot } from "../_lib/analyticsStore";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const snapshot = await getAnalyticsSnapshot();

  return (
    <main>
      <section className="section">
        <div className="container">
          <h1 className="sectionTitle">Analytics</h1>
          <p className="sectionSub">Simple counters for visits and download button clicks.</p>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="cardInner">
              <div className="kpiRow">
                <div className="kpi">
                  <div className="kpiLabel">Total visits</div>
                  <div className="kpiValue">{snapshot.visitsTotal}</div>
                </div>
                <div className="kpi">
                  <div className="kpiLabel">Download clicks</div>
                  <div className="kpiValue">{snapshot.downloadClicksTotal}</div>
                </div>
              </div>

              <div style={{ marginTop: 12, color: "var(--muted2)", fontSize: 13 }}>
                Updated: {new Date(snapshot.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
