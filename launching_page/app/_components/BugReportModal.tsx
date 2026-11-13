"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Copy, ExternalLink, Send, X } from "lucide-react";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const [category, setCategory] = useState("Slideshow Interval");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [windowsVersion, setWindowsVersion] = useState("Windows 11 (64-bit)");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const issueTemplateMarkdown = `### Bug Report: ${title || "Issue with " + category}
**Category:** ${category}
**Operating System:** ${windowsVersion}
**App Version:** v5.1.0

#### Description:
${description || "No description provided."}

#### Steps to Reproduce:
${steps || "1. Open app\n2. Trigger issue"}
`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Log event via analytics endpoint
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "bug_report",
          metadata: {
            category,
            title,
            description,
            steps,
            windowsVersion,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch {
      // Continue even if offline
    }

    setIsSubmitting(false);
    setSubmitted(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(issueTemplateMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const githubIssueUrl = `https://github.com/Debanjan110d/wallpaper-sync-app/issues/new?title=${encodeURIComponent(
    `[Bug]: ${title || category}`
  )}&body=${encodeURIComponent(issueTemplateMarkdown)}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(5, 7, 13, 0.8)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          background: "linear-gradient(180deg, #0d1222 0%, #0a0d18 100%)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "540px",
          padding: "2rem",
          boxShadow: "0 25px 70px rgba(0,0,0,0.8), 0 0 30px rgba(99, 102, 241, 0.2)",
          position: "relative",
          color: "#e2e8f0",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1.2rem",
            right: "1.2rem",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                color: "#4ade80",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <CheckCircle2 size={30} />
            </div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
              Report Received!
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
              Thank you for helping improve Wallpaper Sync! We review every report to roll out fixes fast.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href={githubIssueUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                  color: "#fff",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                Track on GitHub Issues <ExternalLink size={14} />
              </a>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                style={{
                  padding: "10px 18px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#e2e8f0",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.2rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                  Report an Issue or Bug
                </h3>
                <p style={{ fontSize: "0.84rem", color: "#94a3b8", margin: "2px 0 0 0" }}>
                  Help us squash bugs in the desktop app or website
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.88rem",
                      outline: "none",
                    }}
                  >
                    <option value="Slideshow Interval" style={{ background: "#0f172a" }}>Slideshow Interval / Timer</option>
                    <option value="Wallpaper Rotation" style={{ background: "#0f172a" }}>Wallpaper Rotation</option>
                    <option value="Watchdog Auto-Recovery" style={{ background: "#0f172a" }}>Watchdog Auto-Recovery</option>
                    <option value="UI & Visual Styling" style={{ background: "#0f172a" }}>UI & Visual Styling</option>
                    <option value="Performance & RAM" style={{ background: "#0f172a" }}>Performance & RAM</option>
                    <option value="Website & Docs" style={{ background: "#0f172a" }}>Website & Docs</option>
                    <option value="Other" style={{ background: "#0f172a" }}>Other Bug</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "4px" }}>
                    System OS
                  </label>
                  <select
                    value={windowsVersion}
                    onChange={(e) => setWindowsVersion(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.88rem",
                      outline: "none",
                    }}
                  >
                    <option value="Windows 11 (64-bit)" style={{ background: "#0f172a" }}>Windows 11 (64-bit)</option>
                    <option value="Windows 10 (64-bit)" style={{ background: "#0f172a" }}>Windows 10 (64-bit)</option>
                    <option value="Windows 10/11 ARM" style={{ background: "#0f172a" }}>Windows ARM</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Short Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Slideshow timer starts at 10s instead of 30m"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "4px" }}>
                  What happened?
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe what went wrong and what you expected instead..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.88rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <Copy size={13} /> {copied ? "Copied template!" : "Copy as GitHub Issue"}
                </button>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: "8px 14px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#94a3b8",
                      fontSize: "0.86rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: "8px 18px",
                      background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.86rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 10px rgba(239, 68, 68, 0.4)",
                    }}
                  >
                    <Send size={14} /> {isSubmitting ? "Sending..." : "Submit Bug"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

