"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface ReviewItem {
  id: number | string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingCounts: { [key: number]: number };
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 5.0,
    totalReviews: 0,
    ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getReviews = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
        const targetUrl = apiBase ? `${apiBase.replace(/\/$/, "")}/api/reviews` : "/api/reviews";
        
        let res = await fetch(targetUrl);
        if (!res.ok && !apiBase) {
          // Fallback to production web API if relative API route is not hosted locally
          res = await fetch("https://wallpaper-sync-app-web.vercel.app/api/reviews");
        }

        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.reviews)) {
            setReviews(data.reviews);
          }
          if (data && data.stats) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        console.warn("Unable to fetch live reviews from API:", err);
      } finally {
        setLoading(false);
      }
    };

    getReviews();
  }, []);

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
        zIndex: 50
      }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "inherit" }}>
            <Image src="/logo.png" alt="Wallpaper Sync" width={34} height={34} />
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Wallpaper Sync</span>
          </Link>
          <nav style={{ display: "flex", gap: "1.5rem", fontSize: "0.9rem" }}>
            <Link href="/" style={{ color: "rgba(233, 238, 252, 0.72)", textDecoration: "none" }}>← Back to Home</Link>
            <Link href="/docs" style={{ color: "rgba(233, 238, 252, 0.72)", textDecoration: "none" }}>Docs</Link>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "840px", margin: "0 auto", padding: "3.5rem 1.5rem" }}>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 800, marginBottom: "0.5rem", letterSpacing: "-0.5px" }}>
          User Ratings & Feedback
        </h1>
        <p style={{ color: "rgba(233, 238, 252, 0.65)", fontSize: "1.05rem", marginBottom: "2.5rem", lineHeight: 1.6 }}>
          Real feedback submitted directly by active users from the Wallpaper Sync desktop app.
        </p>

        {/* Rating Overview Card */}
        <div style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          padding: "2rem",
          marginBottom: "2.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "2rem",
          alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: "rgba(233, 238, 252, 0.52)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Overall Rating</div>
            <div style={{ fontSize: "3.2rem", fontWeight: 800, color: "#3b82f6", marginTop: "0.25rem", lineHeight: 1 }}>
              {stats.averageRating.toFixed(1)}
              <span style={{ fontSize: "1.4rem", color: "rgba(233, 238, 252, 0.4)", fontWeight: 400 }}> / 5.0</span>
            </div>
            <div style={{ color: "#f59e0b", fontSize: "1.2rem", marginTop: "0.5rem" }}>
              {"★".repeat(Math.round(stats.averageRating)) + "☆".repeat(5 - Math.round(stats.averageRating))}
            </div>
            <div style={{ fontSize: "0.85rem", color: "rgba(233, 238, 252, 0.5)", marginTop: "0.4rem" }}>
              Based on {stats.totalReviews} verified desktop user review{stats.totalReviews === 1 ? "" : "s"}
            </div>
          </div>

          {/* Star Distribution Bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.ratingCounts[star] || 0;
              const percent = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <div key={star} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.85rem" }}>
                  <span style={{ width: "30px", color: "rgba(233, 238, 252, 0.7)", fontWeight: 600 }}>{star} ★</span>
                  <div style={{
                    flex: 1,
                    height: "8px",
                    background: "rgba(255, 255, 255, 0.08)",
                    borderRadius: "4px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: `${percent}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
                      borderRadius: "4px",
                      transition: "width 0.3s ease"
                    }} />
                  </div>
                  <span style={{ width: "32px", textAlign: "right", color: "rgba(233, 238, 252, 0.5)", fontSize: "0.8rem" }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "rgba(233, 238, 252, 0.6)", padding: "3rem" }}>
              Loading user reviews...
            </div>
          ) : reviews.length > 0 ? (
            reviews.map((r) => (
              <div key={r.id} style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "12px",
                padding: "1.5rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      color: "#ffffff"
                    }}>
                      {(r.reviewer_name || "A").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ fontSize: "1rem" }}>{r.reviewer_name || "Anonymous User"}</strong>
                      <div style={{ fontSize: "0.75rem", color: "rgba(233, 238, 252, 0.4)" }}>
                        Desktop App User
                      </div>
                    </div>
                  </div>
                  <span style={{ color: "#f59e0b", fontWeight: "bold", fontSize: "1rem", letterSpacing: "2px" }}>
                    {"★".repeat(r.rating) + "☆".repeat(5 - r.rating)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.6, color: "rgba(233, 238, 252, 0.85)" }}>
                  {r.comment || "No written comment left."}
                </p>
                <div style={{ fontSize: "0.75rem", color: "rgba(233, 238, 252, 0.4)", marginTop: "1rem", textAlign: "right" }}>
                  Submitted on {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))
          ) : (
            <div style={{
              textAlign: "center",
              color: "rgba(233, 238, 252, 0.5)",
              padding: "3.5rem 1.5rem",
              background: "rgba(255, 255, 255, 0.01)",
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              borderRadius: "12px"
            }}>
              No user reviews submitted yet. Feedback prompt appears automatically in the desktop application.
            </div>
          )}
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
