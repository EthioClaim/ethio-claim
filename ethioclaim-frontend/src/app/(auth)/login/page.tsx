"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  login,
  fetchCurrentUser,
  checkHealth,
  getStoredToken,
  clearStoredSession,
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
  const [activeMode, setActiveMode] = useState<"credentials" | "sandbox">("credentials");
  const [mounted, setMounted] = useState(false);

  // Mock sign-up modal
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpForm, setSignUpForm] = useState({
    displayName: "",
    email: "",
    role: "EXAMINER" as "EXAMINER" | "ADMIN" | "INTAKE_USER",
  });
  const [signUpError, setSignUpError] = useState("");

  useEffect(() => {
    setMounted(true);
    const token = getStoredToken();
    if (token) {
      fetchCurrentUser()
        .then(() => {
          router.push("/claims");
        })
        .catch(() => {
          clearStoredSession();
        });
    }
    checkHealth()
      .then((res) => {
        if (res.status === "ok" || res.status) setApiOnline(true);
        else setApiOnline(false);
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
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[#0A84FF]/30 selection:text-white overflow-hidden">
      {/* ── Apple Ambient Background Specular Blooms ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-[15%] left-[20%] w-[600px] h-[600px] rounded-full opacity-[0.14] blur-[140px]"
          style={{ background: "radial-gradient(circle, #0A84FF 0%, #64D2FF 60%, transparent 100%)" }}
        />
        <div
          className="absolute bottom-[10%] right-[15%] w-[520px] h-[520px] rounded-full opacity-[0.09] blur-[130px]"
          style={{ background: "radial-gradient(circle, #BF5AF2 0%, #5E5CE6 50%, transparent 100%)" }}
        />
      </div>

      {/* ── Main Container Card ── */}
      <div
        className="relative z-10 w-full max-w-[480px] card apple-glass p-7 sm:p-9 space-y-6"
        style={{
          borderRadius: "28px",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0A84FF 0%, #0060DF 60%, #64D2FF 100%)",
              boxShadow: "0 8px 24px rgba(10, 132, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
            }}
          >
            <svg className="w-7 h-7 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-[-0.03em] heading-display">
              EthioClaim
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto leading-relaxed">
              Motor claims intelligence, policy verification, and automated damage assessment
            </p>
          </div>
        </div>

        {/* Apple Segmented Control */}
        <div className="flex justify-center">
          <div className="segmented-control w-full grid grid-cols-2">
            <button
              type="button"
              onClick={() => { setActiveMode("credentials"); setError(""); }}
              className={`segmented-item text-center ${activeMode === "credentials" ? "active" : ""}`}
            >
              Account Login
            </button>
            <button
              type="button"
              onClick={() => { setActiveMode("sandbox"); setError(""); }}
              className={`segmented-item text-center ${activeMode === "sandbox" ? "active" : ""}`}
            >
              Demo Sandbox
            </button>
          </div>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div
            className="p-3.5 rounded-xl bg-[#FF453A]/12 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center gap-2.5 animate-fade-in"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Mode 1: Credential Login */}
        {activeMode === "credentials" && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
            <div>
              <label htmlFor="login-username" className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Email or Username *
              </label>
              <div className="relative">
                <input
                  id="login-username"
                  type="text"
                  required
                  className="input text-sm h-11 pl-10"
                  placeholder="name@ethioclaim.et or username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-0">
                  Password *
                </label>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">Min 6 characters</span>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="input text-sm h-11 pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-12 text-sm font-semibold shadow-md flex items-center justify-center gap-2 mt-2"
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
                  <span>Sign In to EthioClaim</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
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
          </form>
        )}

        {/* Mode 2: Quick Demo Sandbox */}
        {activeMode === "sandbox" && (
          <div className="space-y-3 animate-fade-in">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Explore EthioClaim instantly with pre-seeded role permissions:
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleInstantBypass("EXAMINER")}
                className="w-full p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/10 text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#0A84FF]/20 text-[#64D2FF] flex items-center justify-center font-bold text-sm flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-[#64D2FF] transition-colors">
                      Claims Examiner
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Adjudicate claims, loss estimation, fraud signals
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#0A84FF] group-hover:translate-x-0.5 transition-transform">
                  Enter →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleInstantBypass("ADMIN")}
                className="w-full p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/10 text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#BF5AF2]/20 text-[#E39FF6] flex items-center justify-center font-bold text-sm flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-[#E39FF6] transition-colors">
                      System Administrator
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      User access, policy registry, operations & audit
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#BF5AF2] group-hover:translate-x-0.5 transition-transform">
                  Enter →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleInstantBypass("INTAKE_USER")}
                className="w-full p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/10 text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#30D158]/20 text-[#70E08B] flex items-center justify-center font-bold text-sm flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-[#70E08B] transition-colors">
                      Intake Officer
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Register motor claims, verify policies, submit evidence
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#30D158] group-hover:translate-x-0.5 transition-transform">
                  Enter →
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Live System Status Footer */}
        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
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
            <span className="text-[11px] font-medium">
              {apiOnline === true ? "NestJS API Connected" : "Seamless Mock Fallback Ready"}
            </span>
          </div>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">Next.js 16 • Turbo</span>
        </div>
      </div>

      {/* Mock Sign Up Modal */}
      {showSignUpModal && (
        <div className="modal-overlay">
          <div className="modal p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white tracking-tight">Create Sandbox Account</h3>
              <button
                type="button"
                onClick={() => setShowSignUpModal(false)}
                className="text-[var(--text-muted)] hover:text-white"
              >
                ✕
              </button>
            </div>
            {signUpError && (
              <div className="p-3 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-[#FF6961]">
                {signUpError}
              </div>
            )}
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={signUpForm.displayName}
                  onChange={(e) => setSignUpForm({ ...signUpForm, displayName: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Email Address *</label>
                <input
                  type="email"
                  required
                  className="input"
                  value={signUpForm.email}
                  onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Assigned Role *</label>
                <select
                  className="select w-full"
                  value={signUpForm.role}
                  onChange={(e) => setSignUpForm({ ...signUpForm, role: e.target.value as any })}
                >
                  <option value="EXAMINER">Claims Examiner</option>
                  <option value="ADMIN">System Administrator</option>
                  <option value="INTAKE_USER">Intake Officer</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSignUpModal(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
