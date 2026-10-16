"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  login,
  fetchCurrentUser,
  checkHealth,
  bypassLoginAs,
  registerMockAccount,
} from "@/lib/api";
import type { UserRole } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("examiner");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // Custom Mock Sign-Up Modal State
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpForm, setSignUpForm] = useState({
    displayName: "",
    email: "",
    role: "EXAMINER" as "EXAMINER" | "ADMIN" | "INTAKE_USER",
  });
  const [signUpError, setSignUpError] = useState("");

  useEffect(() => {
    // If token already stored, redirect directly to claims
    try {
      const token = localStorage.getItem("ethioclaim_token");
      if (token) {
        router.push("/claims");
        return;
      }
    } catch {
      // ignore
    }

    // Check public health check
    checkHealth()
      .then((res) => {
        if (res.status === "ok" || res.status) {
          setApiOnline(true);
        }
      })
      .catch(() => {
        setApiOnline(false);
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username.trim(), password);
      // Verify session with /auth/me
      try {
        await fetchCurrentUser();
      } catch {
        // Fallback
      }
      router.push("/claims");
    } catch (err: unknown) {
      // If live login fails, gracefully offer fallback or show error
      setError(
        err instanceof Error ? err.message : "Authentication failed. Check your credentials."
      );
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
      {/* Left panel - Showcase */}
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

      {/* Right panel - Login & Mock Bypass */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 py-8">
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
            <h1 className="text-2xl font-bold text-white tracking-tight">Staff Authentication</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Sign in with live credentials or use 1-click mock bypass for offline evaluation
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* 1-CLICK INSTANT OFFLINE ACCESS STRIP */}
          <div className="card apple-glass p-4 space-y-3 border border-[#0A84FF]/25 bg-[#0A84FF]/[0.03]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0A84FF] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#64D2FF]">
                  1-Click Instant Evaluation
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSignUpModal(true)}
                className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-white underline transition-colors"
              >
                + Custom Mock User
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Bypass live authentication and test the portal end-to-end with pre-seeded claims, policies, and AI detections:
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Examiner */}
              <button
                type="button"
                onClick={() => handleInstantBypass("EXAMINER")}
                className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-[#64D2FF]">
                    Claims Examiner
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0A84FF]/20 text-[#64D2FF] font-mono">
                    EXAMINER
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1">
                  Triage queue, assessments & decisions
                </span>
              </button>

              {/* Admin */}
              <button
                type="button"
                onClick={() => handleInstantBypass("ADMIN")}
                className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-[#BF5AF2]">
                    System Admin
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#BF5AF2]/20 text-[#BF5AF2] font-mono">
                    ADMIN
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1">
                  Staff accounts & policy registry
                </span>
              </button>

              {/* Intake */}
              <button
                type="button"
                onClick={() => handleInstantBypass("INTAKE_USER")}
                className="col-span-2 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white group-hover:text-[#30D158]">
                    Intake Officer
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    — Policy verification & intake wizard
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#30D158]/20 text-[#30D158] font-mono">
                  INTAKE
                </span>
              </button>
            </div>
          </div>

          {/* STANDARD CREDENTIAL LOGIN */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[var(--border)]" />
            <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Or Sign In With Credentials
            </span>
            <div className="flex-grow border-t border-[var(--border)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                Username / Email *
              </label>
              <input
                id="login-username"
                type="text"
                required
                className="input text-xs h-11"
                placeholder="examiner or admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                Password *
              </label>
              <input
                id="login-password"
                type="password"
                required
                className="input text-xs h-11"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-11 text-xs font-semibold shadow-sm flex items-center justify-center gap-2"
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
                <span>Sign In via API / Mock Fallback</span>
              )}
            </button>
          </form>

          {/* Quick Fill Demo Accounts */}
          <div className="pt-2 text-center">
            <span className="text-[11px] text-[var(--text-muted)]">
              Default password for all demo accounts: <code className="font-mono text-[#64D2FF]">demo1234</code>
            </span>
          </div>
        </div>
      </div>

      {/* CUSTOM MOCK SIGN-UP MODAL */}
      {showSignUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="card apple-glass max-w-md w-full p-6 space-y-4 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-bold text-white">Create Mock Account</h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Simulate custom credentials and evaluate RBAC roles offline
                </p>
              </div>
              <button
                onClick={() => setShowSignUpModal(false)}
                className="text-[var(--text-muted)] hover:text-white"
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
                  Full Name / Display Name *
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
                  Email Address *
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
                  Assigned RBAC Role *
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
                  <option value="EXAMINER">Claims Examiner (Review, Assess & Decide)</option>
                  <option value="ADMIN">System Administrator (Staff & Policy Management)</option>
                  <option value="INTAKE_USER">Intake Officer (Policy Verification & Intake)</option>
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
                  Create & Launch Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
