"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  login,
  fetchCurrentUser,
  checkHealth,
  getStoredToken,
  bypassLoginAs,
  registerMockAccount,
} from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mock sign-up modal (preserved from original)
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpForm, setSignUpForm] = useState({
    displayName: "",
    email: "",
    role: "EXAMINER" as "EXAMINER" | "ADMIN" | "INTAKE_USER",
  });
  const [signUpError, setSignUpError] = useState("");

  useEffect(() => {
    setMounted(true);
    // If already authenticated, redirect
    if (getStoredToken()) {
      router.push("/claims");
      return;
    }
    checkHealth()
      .then((res) => {
        if (res.status === "ok" || res.status) setApiOnline(true);
      })
      .catch(() => setApiOnline(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your email or username");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      try { await fetchCurrentUser(); } catch { /* fallback */ }
      router.push("/claims");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  function handleInstantBypass(role: "ADMIN" | "EXAMINER" | "INTAKE_USER") {
    bypassLoginAs(role);
    router.push(role === "ADMIN" ? "/admin/users" : "/claims");
  }

  function handleSignUpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSignUpError("");
    if (!signUpForm.email || !signUpForm.displayName) {
      setSignUpError("Please fill out both name and email.");
      return;
    }
    registerMockAccount(signUpForm);
    setShowSignUpModal(false);
    router.push(signUpForm.role === "ADMIN" ? "/admin/users" : "/claims");
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)" }}>
      {/* ── Left Panel — Brand Showcase ─────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between p-8 xl:p-12 w-1/2 min-h-screen overflow-y-auto gap-8"
        style={{
          background: "linear-gradient(135deg, #0d1829 0%, #0f2040 50%, #0a1628 100%)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0A84FF, #64D2FF)" }}
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-mono">
            EthioClaim
          </span>
        </div>

        {/* Hero text */}
        <div className="space-y-6 my-auto py-4">
          <div className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight text-white">
            <span>Motor Claims</span><br />
            <span className="gradient-text">Assistance Platform</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-md">
            Organize motor claims, verify insurer policy records, localize vehicle damage with computer vision, and detect duplicate evidence.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {[
              "Policy Verification",
              "Damage Localization",
              "SHA-256 Exact Duplicate",
              "pHash Near-Duplicate",
              "Visual Vector Search",
              "Examiner Assessment",
              "Offline-First Mock Fallback",
            ].map((f) => (
              <span
                key={f}
                className="badge text-xs"
                style={{
                  background: "rgba(10, 132, 255, 0.15)",
                  color: "#64D2FF",
                  border: "1px solid rgba(10, 132, 255, 0.3)",
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Live System Status */}
        <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  apiOnline === true ? "bg-[#30D158]" : "bg-[#FF9F0A]"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  apiOnline === true ? "bg-[#30D158]" : "bg-[#FF9F0A]"
                }`}
              />
            </span>
            <span>
              {apiOnline === true
                ? "Backend API /api/v1 Connected"
                : "Backend Offline • Automatic Mock Fallback Ready"}
            </span>
          </div>
          <span className="font-mono text-[11px]">Next.js 16 + NestJS</span>
        </div>
      </div>

      {/* ── Right Panel — Login Form ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 overflow-y-auto">
        <div
          className="w-full max-w-md space-y-6 py-8"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0A84FF, #64D2FF)" }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-mono">
              EthioClaim
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Sign in to access the claims intelligence platform
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="p-3.5 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center gap-2"
              style={{ animation: "appleModalSpring 0.38s cubic-bezier(0.34, 1.35, 0.64, 1)" }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* ── Credential Login Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                Email / Username *
              </label>
              <input
                id="login-username"
                type="text"
                required
                className="input text-sm h-11"
                placeholder="Enter your email or username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                Password *
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="input text-sm h-11 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-12 text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* ── Signup Link ── */}
          <div className="text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-[#0A84FF] hover:text-[#64D2FF] transition-colors"
              >
                Create Account
              </Link>
            </p>
          </div>

          {/* ── Quick-Access Offline Evaluation ── */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[var(--border)]" />
            <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Offline Evaluation
            </span>
            <div className="flex-grow border-t border-[var(--border)]" />
          </div>

          <div className="card apple-glass p-4 space-y-3 border border-[var(--border)] bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9F0A]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  1-Click Mock Bypass
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSignUpModal(true)}
                className="text-[10px] font-semibold text-[var(--text-muted)] hover:text-white underline transition-colors"
              >
                + Custom User
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([
                { role: "EXAMINER" as const, label: "Examiner", color: "#0A84FF" },
                { role: "ADMIN" as const, label: "Admin", color: "#BF5AF2" },
                { role: "INTAKE_USER" as const, label: "Intake", color: "#30D158" },
              ]).map((opt) => (
                <button
                  key={opt.role}
                  type="button"
                  onClick={() => handleInstantBypass(opt.role)}
                  className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-center transition-all group"
                >
                  <span className="text-[11px] font-semibold text-white group-hover:text-[var(--accent-blue)]">
                    {opt.label}
                  </span>
                  <span
                    className="block text-[9px] font-mono mt-0.5"
                    style={{ color: opt.color }}
                  >
                    {opt.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Custom Mock Sign-Up Modal (preserved) ── */}
      {showSignUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="card apple-glass max-w-md w-full p-6 space-y-4 border border-white/10 shadow-2xl"
            style={{ animation: "appleModalSpring 0.38s cubic-bezier(0.34, 1.35, 0.64, 1)" }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-bold text-white">Create Mock Account</h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Simulate custom credentials offline
                </p>
              </div>
              <button
                onClick={() => setShowSignUpModal(false)}
                className="text-[var(--text-muted)] hover:text-white transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {signUpError && (
              <div className="p-3 rounded-lg text-xs bg-[#FF453A]/10 border border-[#FF453A]/30 text-[#FF453A]">
                {signUpError}
              </div>
            )}

            <form onSubmit={handleSignUpSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={signUpForm.displayName}
                  onChange={(e) => setSignUpForm({ ...signUpForm, displayName: e.target.value })}
                  placeholder="e.g. Meron Bekele"
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={signUpForm.email}
                  onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })}
                  placeholder="meron@ethioclaim.et"
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Role *
                </label>
                <select
                  value={signUpForm.role}
                  onChange={(e) =>
                    setSignUpForm({
                      ...signUpForm,
                      role: e.target.value as "EXAMINER" | "ADMIN" | "INTAKE_USER",
                    })
                  }
                  className="input w-full text-xs"
                >
                  <option value="EXAMINER">Claims Examiner</option>
                  <option value="ADMIN">System Admin</option>
                  <option value="INTAKE_USER">Intake Officer</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowSignUpModal(false)}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2"
                >
                  Create & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
