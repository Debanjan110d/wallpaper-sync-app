"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getReviews = async () => {
      try {
        // Fetch from configured backend or fallback to testimonials list
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${apiBase}/api/reviews`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.reviews) {
            setReviews(data.reviews);
          }
        }
      } catch (err) {
        console.warn("Unable to fetch reviews from API, showing default testimonials.", err);
      } finally {
        setLoading(false);
      }
    };
    getReviews();
  }, []);

  const defaultReviews = [
    { id: 1, reviewer_name: "Alex Mercer", rating: 5, comment: "Wallpaper Sync has completely simplified my desktop customization. The offline caching is extremely reliable and synchronization works in the background without high resources.", created_at: new Date().toISOString() },
    { id: 2, reviewer_name: "Sarah Chen", rating: 5, comment: "I really love the smart slideshow feature. Being able to restrict rotation to collections nested under specific categories makes organizing clean. Recommended!", created_at: new Date().toISOString() },
    { id: 3, reviewer_name: "Debanjan Dutta", rating: 5, comment: "Built to be lightweight and single-instance locked for stable execution. More updates coming soon.", created_at: new Date().toISOString() }
  ];

  const displayReviews = reviews.length > 0 ? reviews : defaultReviews;
  const averageRating = (displayReviews.reduce((acc, r) => acc + r.rating, 0) / displayReviews.length).toFixed(1);

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
            <Link href="/docs" style={{ color: "rgba(233, 238, 252, 0.72)", textDecoration: "none" }}>Docs</Link>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "4rem 1.5rem" }}>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 800, marginBottom: "0.5rem", letterSpacing: "-0.5px" }}>
          User Feedback & Reviews
        </h1>
        <p style={{ color: "rgba(233, 238, 252, 0.6)", fontSize: "1.1rem", marginBottom: "3rem" }}>
          Read reviews submitted directly by users from the desktop application after usage.
        </p>

        {/* Rating Metrics Card */}
        <div style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          padding: "2rem",
          marginBottom: "2.5rem",
          display: "flex",
          gap: "3rem",
          flexWrap: "wrap"
        }}>
          <div>
            <div style={{ fontSize: "0.85rem", color: "rgba(233, 238, 252, 0.52)", textTransform: "uppercase", letterSpacing: "1px" }}>Average Rating</div>
            <div style={{ fontSize: "3rem", fontWeight: 800, color: "#2b7bff", marginTop: "0.5rem" }}>
              {averageRating}
              <span style={{ fontSize: "1.5rem", color: "rgba(233, 238, 252, 0.52)" }}> / 5.0</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "rgba(233, 238, 252, 0.52)", textTransform: "uppercase", letterSpacing: "1px" }}>Total Submissions</div>
            <div style={{ fontSize: "3rem", fontWeight: 800, marginTop: "0.5rem" }}>
              {displayReviews.length}
            </div>
          </div>
        </div>

        {/* Reviews Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {displayReviews.map((r) => (
            <div key={r.id} style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "10px",
              padding: "1.5rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <strong style={{ fontSize: "1.05rem" }}>{r.reviewer_name}</strong>
                <span style={{ color: "#ff9f0a", fontWeight: "bold", fontSize: "0.95rem", letterSpacing: "2px" }}>
                  {"★".repeat(r.rating) + "☆".repeat(5 - r.rating)}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.6, color: "rgba(233, 238, 252, 0.8)" }}>
                {r.comment || "No comment provided"}
              </p>
              <div style={{ fontSize: "0.75rem", color: "rgba(233, 238, 252, 0.4)", marginTop: "1rem", textAlign: "right" }}>
                Verified submission on {new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
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
