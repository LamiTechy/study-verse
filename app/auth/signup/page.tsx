"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess("Check your email to confirm your account.");
      setEmail("");
      setPassword("");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", overflow: "hidden" }}>
      {/* Left panel — branding */}
      <div
        style={{
          display: "none",
          flex: "0 0 440px",
          background: "var(--bg-raised)",
          borderRight: "1px solid var(--border)",
          padding: "48px",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
        }}
        className="auth-left"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark size={32} />
          <span className="serif" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--text)" }}>
            StudyForge
          </span>
        </div>
        <div>
          <p
            className="serif"
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              marginBottom: 20,
            }}
          >
            Start your journey to<br />
            <em style={{ color: "var(--accent)" }}>academic excellence</em>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {["AI-powered study tools", "Personalized learning paths", "Join our community"].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "var(--accent-dim)",
                    border: "1px solid var(--accent-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span style={{ color: "var(--text-dim)", fontSize: 13 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>
          studyforge.app · v2.0
        </p>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: 360, animation: "fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) both" }}>
          {/* Mobile logo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 32 }} className="auth-mobile-logo">
            <LogoMark size={28} />
            <span className="serif" style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>
              StudyForge
            </span>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.025em", marginBottom: 6, color: "var(--text)" }} className="serif">
            Create account
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 28 }}>
            Start learning smarter today with AI-powered tools
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-dim)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="input"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-dim)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="input"
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-dim)",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: "var(--red-dim)",
                  border: "1px solid var(--red-border)",
                  borderRadius: "var(--radius)",
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "var(--red)",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  animation: "scaleIn 0.2s ease both",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  background: "var(--green-dim)",
                  border: "1px solid var(--green-border)",
                  borderRadius: "var(--radius)",
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "var(--green)",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                {success}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", padding: "13px 0", marginTop: 2, fontSize: 13 }}>
              {loading ? (
                <>
                  <Spinner size={14} color="#fff" /> Please wait…
                </>
              ) : (
                "Create Account →"
              )}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: "center", fontSize: 13 }}>
            <span style={{ color: "var(--text-dim)" }}>Already have an account? </span>
            <Link href="/auth/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
              Sign in →
            </Link>
          </div>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link href="/" style={{ color: "var(--text-dim)", textDecoration: "none", fontSize: 12 }}>
              ← Back to home
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media(min-width:800px) { .auth-left{display:flex!important} .auth-mobile-logo{display:none!important} }
      `}</style>
    </div>
  );
}

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="var(--accent)" fillOpacity=".14" />
      <rect width="32" height="32" rx="9" stroke="var(--accent)" strokeOpacity=".35" fill="none" />
      <path d="M9 11.5h14M9 16h9M9 20.5h11.5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="20.5" r="3.5" fill="var(--accent)" fillOpacity=".9" />
      <circle cx="24" cy="20.5" r="1.5" fill="#fff" fillOpacity=".9" />
    </svg>
  );
}

function Spinner({ size = 16, color = "var(--accent)" }: { size?: number; color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `1.5px solid ${color}30`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "spin 0.75s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
