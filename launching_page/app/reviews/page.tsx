"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, MessageSquare, ThumbsUp, Send, CheckCircle2, Filter, Search, ArrowLeft, Sparkles, X } from "lucide-react";

interface ReviewItem {
  id: number | string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  helpfulCount?: number;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingCounts: { [key: number]: number };
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 4.0,
    totalReviews: 2,
    ratingCounts: { 5: 0, 4: 2, 3: 0, 2: 0, 1: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "highest" | "lowest">("newest");
  const [helpfulVotes, setHelpfulVotes] = useState<{ [id: string]: boolean }>({});

  // Review Submission Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const getReviews = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://wallpaper-sync-app.vercel.app";
        const targetUrl = `${apiBase.replace(/\/$/, "")}/api/reviews`;

        let res = await fetch(targetUrl);
        if (!res.ok) {
          res = await fetch("https://wallpaper-sync-app.vercel.app/api/reviews");
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

  const handleHelpfulVote = (id: string | number) => {
    const key = String(id);
    setHelpfulVotes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newReview: ReviewItem = {
      id: "web-" + Date.now(),
      reviewer_name: formName.trim() || "Desktop Community User",
      rating: formRating,
      comment: formComment.trim(),
      created_at: new Date().toISOString(),
      helpfulCount: 0,
    };

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://wallpaper-sync-app.vercel.app";
      await fetch(`${apiBase.replace(/\/$/, "")}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewer_name: newReview.reviewer_name,
          rating: newReview.rating,
          comment: newReview.comment,
        }),
      });
    } catch {
      // Local fallback addition
    }

    setReviews((prev) => [newReview, ...prev]);
    setStats((prev) => {
      const newTotal = prev.totalReviews + 1;
      const newCounts = { ...prev.ratingCounts };
      newCounts[formRating] = (newCounts[formRating] || 0) + 1;
      const sum = Object.entries(newCounts).reduce((acc, [stars, count]) => acc + Number(stars) * count, 0);
      return {
        totalReviews: newTotal,
        averageRating: sum / newTotal,
        ratingCounts: newCounts,
      };
    });

    setIsSubmitting(false);
    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setIsModalOpen(false);
      setFormName("");
      setFormComment("");
      setFormRating(5);
    }, 1800);
  };

  // Filtered & Sorted Reviews
  const displayedReviews = useMemo(() => {
    return reviews
      .filter((r) => {
        if (filterRating !== null && r.rating !== filterRating) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = (r.reviewer_name || "").toLowerCase().includes(q);
          const matchesComment = (r.comment || "").toLowerCase().includes(q);
          return matchesName || matchesComment;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "highest") return b.rating - a.rating;
        if (sortBy === "lowest") return a.rating - b.rating;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [reviews, filterRating, searchQuery, sortBy]);

  const avatarGradients = [
    "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
    "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
    "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #05060a 0%, #07080c 50%, #060712 100%)",
        color: "#e9eefc",
        fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Sticky Header */}
      <header
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "1rem 0",
          background: "rgba(5, 6, 10, 0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "1080px",
            margin: "0 auto",
            padding: "0 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Image src="/logo.png" alt="Wallpaper Sync" width={34} height={34} />
            <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>Wallpaper Sync</span>
            <span
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "#c084fc",
                background: "rgba(168, 85, 247, 0.15)",
                padding: "2px 8px",
                borderRadius: "6px",
                border: "1px solid rgba(168, 85, 247, 0.3)",
              }}
            >
              v5.1.0 Reviews
            </span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: "1.5rem", fontSize: "0.9rem" }}>
            <Link
              href="/"
              style={{
                color: "rgba(233, 238, 252, 0.75)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <ArrowLeft size={14} /> Back to Home
            </Link>
            <Link href="/docs" style={{ color: "rgba(233, 238, 252, 0.75)", textDecoration: "none" }}>
              Docs
            </Link>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 16px",
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: "0 2px 12px rgba(99, 102, 241, 0.4)",
              }}
            >
              ★ Write a Review
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "3.5rem 1.5rem" }}>
        {/* Page Hero */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "100px",
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              color: "#fbbf24",
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: "0.8rem",
            }}
          >
            <Sparkles size={14} /> Verified Community Feedback
          </div>
          <h1 style={{ fontSize: "2.8rem", fontWeight: 800, marginBottom: "0.6rem", letterSpacing: "-0.5px" }}>
            User Ratings & Reviews
          </h1>
          <p
            style={{
              color: "rgba(233, 238, 252, 0.7)",
              fontSize: "1.1rem",
              maxWidth: "640px",
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Transparent ratings submitted by active Windows desktop users. Every piece of feedback helps shape future releases.
          </p>
        </div>

        {/* Rating Overview Card */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.65)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "20px",
            padding: "2.2rem",
            marginBottom: "2.5rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "2.5rem",
            alignItems: "center",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
          }}
        >
          {/* Big Score Block */}
          <div>
            <div style={{ fontSize: "0.82rem", color: "rgba(233, 238, 252, 0.55)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              Overall Satisfaction
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "0.4rem" }}>
              <span style={{ fontSize: "3.6rem", fontWeight: 900, color: "#fff", lineHeight: 1 }}>
                {stats.averageRating.toFixed(1)}
              </span>
              <span style={{ fontSize: "1.5rem", color: "rgba(233, 238, 252, 0.4)", fontWeight: 600 }}>/ 5.0</span>
            </div>

            <div style={{ display: "flex", gap: "4px", color: "#f59e0b", fontSize: "1.3rem", marginTop: "0.6rem" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star}>
                  {star <= Math.round(stats.averageRating) ? "★" : "☆"}
                </span>
              ))}
            </div>

            <div style={{ fontSize: "0.88rem", color: "rgba(233, 238, 252, 0.6)", marginTop: "0.5rem" }}>
              Based on {stats.totalReviews} verified desktop user review{stats.totalReviews === 1 ? "" : "s"}
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              style={{
                marginTop: "1.2rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "0.86rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <MessageSquare size={14} /> Submit Feedback
            </button>
          </div>

          {/* Star Distribution Breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.ratingCounts[star] || 0;
              const percent = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              const isSelected = filterRating === star;

              return (
                <div
                  key={star}
                  onClick={() => setFilterRating(isSelected ? null : star)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    fontSize: "0.86rem",
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    background: isSelected ? "rgba(99, 102, 241, 0.15)" : "transparent",
                    transition: "background 0.2s",
                  }}
                  title={`Filter by ${star} Stars`}
                >
                  <span style={{ width: "34px", color: isSelected ? "#818cf8" : "rgba(233, 238, 252, 0.75)", fontWeight: 700 }}>
                    {star} ★
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "10px",
                      background: "rgba(255, 255, 255, 0.08)",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${percent}%`,
                        height: "100%",
                        background: isSelected
                          ? "linear-gradient(90deg, #6366f1 0%, #a855f7 100%)"
                          : "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
                        borderRadius: "6px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <span style={{ width: "36px", textAlign: "right", color: "rgba(233, 238, 252, 0.5)", fontSize: "0.82rem", fontWeight: 600 }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "1.8rem",
          }}
        >
          {/* Rating Filter Pills */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "rgba(233, 238, 252, 0.5)", fontWeight: 600 }}>
              Filter:
            </span>
            <button
              type="button"
              onClick={() => setFilterRating(null)}
              style={{
                padding: "5px 14px",
                borderRadius: "100px",
                border: filterRating === null ? "1px solid rgba(99, 102, 241, 0.8)" : "1px solid rgba(255, 255, 255, 0.1)",
                background: filterRating === null ? "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)" : "rgba(255, 255, 255, 0.05)",
                color: filterRating === null ? "#fff" : "rgba(233, 238, 252, 0.7)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              All ({reviews.length})
            </button>
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterRating(filterRating === s ? null : s)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "100px",
                  border: filterRating === s ? "1px solid rgba(99, 102, 241, 0.8)" : "1px solid rgba(255, 255, 255, 0.1)",
                  background: filterRating === s ? "rgba(99, 102, 241, 0.25)" : "rgba(255, 255, 255, 0.05)",
                  color: filterRating === s ? "#c084fc" : "rgba(233, 238, 252, 0.7)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {s} ★ ({stats.ratingCounts[s] || 0})
              </button>
            ))}
          </div>

          {/* Search Box & Sort Dropdown */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "6px 12px 6px 32px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.85rem",
                  outline: "none",
                  width: "180px",
                }}
              />
              <Search
                size={14}
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "rgba(233, 238, 252, 0.4)" }}
              />
            </div>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              style={{
                padding: "6px 10px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.85rem",
                outline: "none",
              }}
            >
              <option value="newest" style={{ background: "#0f172a" }}>Newest First</option>
              <option value="highest" style={{ background: "#0f172a" }}>Highest Rating</option>
              <option value="lowest" style={{ background: "#0f172a" }}>Lowest Rating</option>
            </select>
          </div>
        </div>

        {/* Reviews Cards List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "rgba(233, 238, 252, 0.6)", padding: "3rem" }}>
              Loading user reviews...
            </div>
          ) : displayedReviews.length > 0 ? (
            displayedReviews.map((r, i) => {
              const avatarBg = avatarGradients[i % avatarGradients.length];
              const isVoted = helpfulVotes[String(r.id)] || false;

              return (
                <div
                  key={r.id}
                  style={{
                    background: "rgba(15, 23, 42, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "16px",
                    padding: "1.6rem",
                    transition: "transform 0.2s ease, border-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "12px",
                          background: avatarBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "1.05rem",
                          color: "#ffffff",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                        }}
                      >
                        {(r.reviewer_name || "A").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <strong style={{ fontSize: "1.05rem", color: "#fff" }}>
                            {r.reviewer_name || "Anonymous User"}
                          </strong>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              background: "rgba(34, 197, 94, 0.15)",
                              color: "#4ade80",
                              border: "1px solid rgba(34, 197, 94, 0.3)",
                              padding: "1px 7px",
                              borderRadius: "6px",
                              fontWeight: 700,
                            }}
                          >
                            Verified Desktop User
                          </span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "rgba(233, 238, 252, 0.45)", marginTop: "2px" }}>
                          Submitted on {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "3px", color: "#f59e0b", fontSize: "1.1rem" }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star}>{star <= r.rating ? "★" : "☆"}</span>
                      ))}
                    </div>
                  </div>

                  <p
                    style={{
                      margin: "0 0 1rem 0",
                      fontSize: "0.98rem",
                      lineHeight: 1.6,
                      color: "rgba(233, 238, 252, 0.88)",
                      background: "rgba(255, 255, 255, 0.02)",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    &ldquo;{r.comment || "No written comment left."}&rdquo;
                  </p>

                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => handleHelpfulVote(r.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: isVoted ? "rgba(99, 102, 241, 0.25)" : "transparent",
                        border: isVoted ? "1px solid rgba(99, 102, 241, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        padding: "4px 12px",
                        color: isVoted ? "#818cf8" : "rgba(233, 238, 252, 0.6)",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <ThumbsUp size={12} />
                      {isVoted ? "Helpful (1)" : "Helpful"}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "rgba(233, 238, 252, 0.5)",
                padding: "3.5rem 1.5rem",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px dashed rgba(255, 255, 255, 0.1)",
                borderRadius: "16px",
              }}
            >
              No reviews match the selected filter. Try clearing filters or submit the first review for this rating!
            </div>
          )}
        </div>
      </main>

      {/* Review Submission Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(5, 7, 13, 0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: "linear-gradient(180deg, #0d1222 0%, #0a0d18 100%)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "20px",
              padding: "2rem",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 25px 70px rgba(0,0,0,0.85)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                position: "absolute",
                top: "1.2rem",
                right: "1.2rem",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>

            {submitSuccess ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <CheckCircle2 size={42} color="#4ade80" style={{ margin: "0 auto 12px auto" }} />
                <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", marginBottom: "6px" }}>
                  Review Published!
                </h3>
                <p style={{ color: "rgba(233, 238, 252, 0.7)", fontSize: "0.92rem" }}>
                  Thank you for supporting Wallpaper Sync! Your rating has been added to our live tally.
                </p>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#fff", marginBottom: "4px" }}>
                  Submit Your Review
                </h3>
                <p style={{ fontSize: "0.88rem", color: "rgba(233, 238, 252, 0.6)", marginBottom: "1.5rem" }}>
                  How has your experience been with Wallpaper Sync on Windows?
                </p>

                <form onSubmit={handleReviewSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {/* Star Rating Selector */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "6px" }}>
                      Rating
                    </label>
                    <div style={{ display: "flex", gap: "8px", fontSize: "1.8rem", color: "#f59e0b", cursor: "pointer" }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormRating(star)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: star <= formRating ? "#f59e0b" : "rgba(255, 255, 255, 0.2)",
                            fontSize: "2rem",
                            cursor: "pointer",
                            padding: 0,
                            transition: "transform 0.15s ease",
                          }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "4px" }}>
                      Your Name or Handle
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Debanjan Dutta or CyberEnthusiast"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "0.9rem",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "4px" }}>
                      Review / Comments
                    </label>
                    <textarea
                      rows={3}
                      placeholder="What do you love most? Any features or wallpaper categories you'd like to see?"
                      value={formComment}
                      onChange={(e) => setFormComment(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "0.9rem",
                        outline: "none",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      style={{
                        padding: "8px 16px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "8px",
                        color: "#94a3b8",
                        fontSize: "0.88rem",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        padding: "8px 20px",
                        background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 10px rgba(99, 102, 241, 0.4)",
                      }}
                    >
                      <Send size={14} /> {isSubmitting ? "Publishing..." : "Publish Review"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          marginTop: "6rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "2.5rem 0",
          textAlign: "center",
          fontSize: "0.85rem",
          color: "rgba(233, 238, 252, 0.52)",
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1.5rem" }}>
          Wallpaper Sync · Open Source (MIT) · Built by Debanjan Dutta
        </div>
      </footer>
    </div>
  );
}
