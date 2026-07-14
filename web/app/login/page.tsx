"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
      }
    } catch (err) {
      setError("An error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        background: "radial-gradient(circle at center, #1e2025 0%, #111215 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Outfit', sans-serif"
      }}
    >
      {/* Decorative ambient background glows */}
      <div 
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(26, 115, 232, 0.15) 0%, transparent 70%)",
          top: "10%",
          left: "15%",
          filter: "blur(40px)",
          pointerEvents: "none"
        }}
      />
      <div 
        style={{
          position: "absolute",
          width: "450px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 159, 10, 0.1) 0%, transparent 70%)",
          bottom: "10%",
          right: "15%",
          filter: "blur(40px)",
          pointerEvents: "none"
        }}
      />

      {/* Main Glassmorphism Card */}
      <div 
        style={{ 
          width: "100%", 
          maxWidth: "420px",
          background: "rgba(32, 33, 36, 0.65)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "2.5rem",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
          zIndex: 10,
          margin: "1rem"
        }}
      >
        {/* Header/Logo Section */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div 
            style={{ 
              width: "72px", 
              height: "72px", 
              borderRadius: "20px", 
              background: "linear-gradient(135deg, #1a73e8 0%, #0056b3 100%)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              color: "white", 
              fontWeight: 700, 
              fontSize: "26px", 
              margin: "0 auto 1.25rem",
              boxShadow: "0 8px 24px rgba(26, 115, 232, 0.4)",
              position: "relative",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
          >
            {/* Glowing ring animation */}
            <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "20px", border: "2px solid rgba(26, 115, 232, 0.3)", transform: "scale(1.15)", pointerEvents: "none" }} />
            WS
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff", margin: "0 0 0.5rem 0", letterSpacing: "-0.5px" }}>
            Welcome Back
          </h2>
          <p style={{ fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.5)", margin: 0 }}>
            Enter your admin password to access the panel
          </p>
        </div>
        
        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.6rem", fontWeight: 500, fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.75)", textTransform: "uppercase", letterSpacing: "1px" }}>
              Admin Password
            </label>
            <div style={{ position: "relative" }}>
              {/* Lock SVG Icon on Left */}
              <svg 
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255, 255, 255, 0.35)", pointerEvents: "none" }}
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>

              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
                autoFocus
                placeholder="••••••••••••"
                style={{
                  width: "100%",
                  padding: "0.8rem 2.8rem 0.8rem 2.5rem",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  background: "rgba(0, 0, 0, 0.2)",
                  color: "#fff",
                  fontSize: "1rem",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "all 0.2s ease-in-out",
                  fontFamily: password ? undefined : "sans-serif"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#1a73e8";
                  e.target.style.boxShadow = "0 0 0 3px rgba(26, 115, 232, 0.25)";
                  e.target.style.background = "rgba(0, 0, 0, 0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.12)";
                  e.target.style.boxShadow = "none";
                  e.target.style.background = "rgba(0, 0, 0, 0.2)";
                }}
              />

              {/* Password Eye Toggle Icon on Right */}
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: showPassword ? "#1a73e8" : "rgba(255, 255, 255, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  outline: "none",
                  transition: "color 0.2s"
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                color: "#ff4d4d", 
                fontSize: "0.85rem", 
                margin: "0.5rem 0 1rem 0",
                background: "rgba(255, 77, 77, 0.1)",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid rgba(255, 77, 77, 0.2)"
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading || !password} 
            style={{ 
              width: "100%", 
              marginTop: "1.25rem",
              background: "linear-gradient(135deg, #1a73e8 0%, #0056b3 100%)",
              color: "white",
              border: "none",
              padding: "0.8rem 1.2rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.95rem",
              boxShadow: "0 4px 16px rgba(26, 115, 232, 0.25)",
              transition: "all 0.2s ease-in-out",
              opacity: (loading || !password) ? 0.6 : 1,
              transform: "scale(1)"
            }}
            onMouseEnter={(e) => {
              if (!loading && password) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(26, 115, 232, 0.35)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(26, 115, 232, 0.25)";
            }}
          >
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
