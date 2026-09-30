"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mockLogin } from "@/lib/api";
import type { Metadata } from "next";

// Quick auth store using localStorage
function saveAuth(user: object, token: string) {
  localStorage.setItem("ethioclaim_user", JSON.stringify(user));
  localStorage.setItem("ethioclaim_token", token);
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("examiner@ethioclaim.io");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user, token } = await mockLogin(email, password);
      saveAuth(user, token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const demoAccounts = [
    { label: "Claims Examiner", email: "examiner@ethioclaim.io" },
    { label: "Claims Manager",  email: "manager@ethioclaim.io"  },
    { label: "Administrator",   email: "admin@ethioclaim.io"    },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)" }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 w-1/2"
        style={{
          background: "linear-gradient(135deg, #0d1829 0%, #0f2040 50%, #0a1628 100%)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xl font-bold" style={{ fontFamily: "Space Grotesk, sans-serif", color: "#f1f5f9" }}>
            EthioClaim
          </span>
        </div>

        {/* Hero text */}
        <div className="space-y-6">
          <div className="text-5xl font-bold leading-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            <span className="text-white">Motor Claims</span><br />
            <span className="gradient-text">Intelligence</span><br />
            <span className="text-white">Platform</span>
          </div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: "420px" }}>
            AI-powered damage detection, evidence consistency analysis, and intelligent triage for Ethiopian insurers.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            {["Damage Detection", "OCR Extraction", "Risk Triage", "Fraud Signals", "Image Similarity"].map((f) => (
              <span key={f} className="badge" style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Claims Processed", value: "1,847" },
            { label: "Avg. AI Accuracy", value: "91%" },
            { label: "Time Saved", value: "68%" },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <div className="text-2xl font-bold gradient-text">{s.value}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>EthioClaim</span>
          </div>

          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Welcome back
          </h1>
          <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
            Sign in to your EthioClaim workspace
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organization.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary w-full justify-center"
              style={{ padding: "12px", fontSize: "1rem" }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </span>
              ) : "Sign In"}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>DEMO ACCOUNTS (password: demo1234)</p>
            <div className="space-y-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => { setEmail(acc.email); setPassword("demo1234"); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-all"
                  style={{
                    background: email === acc.email ? "rgba(59,130,246,0.1)" : "var(--bg-elevated)",
                    border: `1px solid ${email === acc.email ? "rgba(59,130,246,0.3)" : "var(--border)"}`,
                    color: "var(--text-primary)",
                  }}
                >
                  <span className="font-medium">{acc.label}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
