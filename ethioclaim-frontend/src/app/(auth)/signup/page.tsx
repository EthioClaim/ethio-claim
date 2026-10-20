"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register, checkHealth, getStoredToken } from "@/lib/api";

type RoleOption = "EXAMINER" | "ADMIN" | "INTAKE_USER";

const ROLE_META: Record<RoleOption, { label: string; description: string; color: string; icon: string }> = {
  EXAMINER: {
    label: "Claims Examiner",
    description: "Review claims, assess damage, and make decisions",
    color: "#0A84FF",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  },
  INTAKE_USER: {
    label: "Intake Officer",
    description: "Verify policies and register new claims",
    color: "#30D158",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
  ADMIN: {
    label: "System Admin",
    description: "Manage staff accounts and policy registry",
    color: "#BF5AF2",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
};

export default function SignupPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<RoleOption>("EXAMINER");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Redirect if already authenticated
    if (getStoredToken()) {
      router.push("/claims");
      return;
    }
    checkHealth()
      .then((res) => { if (res.status) setApiOnline(true); })
      .catch(() => setApiOnline(false));
  }, [router]);

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!password || password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        username: fullName.trim(),
        password,
        role,
      });
      router.push("/claims");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
        <Link href="/login" className="flex items-center gap-3 group w-fit">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0A84FF, #64D2FF)" }}
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-mono group-hover:text-[#64D2FF] transition-colors">
            EthioClaim
          </span>
        </Link>

        {/* Hero text */}
        <div className="space-y-6 my-auto py-4">
          <div className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight text-white">
            <span>Join the</span><br />
            <span className="gradient-text">Claims Platform</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-md">
            Create your staff account to access the AI-powered motor claims processing system. 
            Manage claims, verify policies, and analyze evidence with computer vision.
          </p>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            {[
              { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", label: "Encrypted" },
              { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "RBAC Secured" },
              { icon: "M13 10V3L4 14h7v7l9-11h-7z", label: "AI-Powered" },
              { icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z", label: "Local Platform" },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                <svg className="w-4 h-4 text-[#64D2FF] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={badge.icon} />
                </svg>
                <span className="text-xs font-medium text-[var(--text-secondary)]">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System status */}
        <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${apiOnline ? "bg-[#30D158]" : "bg-[#FF9F0A]"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${apiOnline ? "bg-[#30D158]" : "bg-[#FF9F0A]"}`} />
            </span>
            <span>{apiOnline ? "Backend API Connected" : "Checking connection…"}</span>
          </div>
          <span className="font-mono text-[11px]">EthioClaim v1.0</span>
        </div>
      </div>

      {/* ── Right Panel — Registration Form ────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 overflow-y-auto">
        <div
          className="w-full max-w-lg space-y-6 py-8"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0A84FF, #64D2FF)" }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-mono">EthioClaim</span>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">Create Account</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Register a new staff account to access the claims platform
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

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            {/* ── Role Picker ── */}
            <div>
              <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold mb-3 block">
                Account Role *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ROLE_META) as RoleOption[]).map((r) => {
                  const meta = ROLE_META[r];
                  const isActive = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className="p-3 rounded-xl text-left transition-all group flex flex-col gap-2"
                      style={{
                        background: isActive ? `${meta.color}12` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isActive ? `${meta.color}50` : "var(--border)"}`,
                        transform: isActive ? "scale(1)" : "scale(1)",
                        boxShadow: isActive ? `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px ${meta.color}30` : "none",
                      }}
                    >
                      <svg
                        className="w-5 h-5 transition-colors"
                        style={{ color: isActive ? meta.color : "var(--text-muted)" }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={meta.icon} />
                      </svg>
                      <div>
                        <div className="text-[11px] font-bold transition-colors" style={{ color: isActive ? meta.color : "var(--text-primary)" }}>
                          {meta.label}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">
                          {meta.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Full Name ── */}
            <div>
              <label htmlFor="signup-name" className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                Full Name *
              </label>
              <input
                id="signup-name"
                type="text"
                required
                className="input text-sm h-11"
                placeholder="e.g. Meron Bekele"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setFieldErrors((p) => ({ ...p, fullName: "" })); }}
                style={fieldErrors.fullName ? { borderColor: "#FF453A", boxShadow: "0 0 0 3px rgba(255,69,58,0.15)" } : undefined}
              />
              {fieldErrors.fullName && (
                <p className="text-[11px] text-[#FF453A] mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" /></svg>
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* ── Email ── */}
            <div>
              <label htmlFor="signup-email" className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                Email Address *
              </label>
              <input
                id="signup-email"
                type="email"
                required
                className="input text-sm h-11"
                placeholder="meron@ethioclaim.et"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: "" })); }}
                style={fieldErrors.email ? { borderColor: "#FF453A", boxShadow: "0 0 0 3px rgba(255,69,58,0.15)" } : undefined}
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-[#FF453A] mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" /></svg>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* ── Password ── */}
            <div>
              <label htmlFor="signup-password" className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                Password *
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="input text-sm h-11 pr-10"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: "" })); }}
                  style={fieldErrors.password ? { borderColor: "#FF453A", boxShadow: "0 0 0 3px rgba(255,69,58,0.15)" } : undefined}
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
              {fieldErrors.password && (
                <p className="text-[11px] text-[#FF453A] mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" /></svg>
                  {fieldErrors.password}
                </p>
              )}

              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="progress-bar h-1">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: password.length < 6 ? "25%" : password.length < 10 ? "50%" : password.length < 14 ? "75%" : "100%",
                        background: password.length < 6 ? "#FF453A" : password.length < 10 ? "#FF9F0A" : "#30D158",
                      }}
                    />
                  </div>
                  <p className="text-[10px]" style={{ color: password.length < 6 ? "#FF453A" : password.length < 10 ? "#FF9F0A" : "#30D158" }}>
                    {password.length < 6 ? "Too short" : password.length < 10 ? "Fair" : password.length < 14 ? "Strong" : "Excellent"}
                  </p>
                </div>
              )}
            </div>

            {/* ── Confirm Password ── */}
            <div>
              <label htmlFor="signup-confirm" className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                Confirm Password *
              </label>
              <input
                id="signup-confirm"
                type={showPassword ? "text" : "password"}
                required
                className="input text-sm h-11"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((p) => ({ ...p, confirmPassword: "" })); }}
                style={fieldErrors.confirmPassword ? { borderColor: "#FF453A", boxShadow: "0 0 0 3px rgba(255,69,58,0.15)" } : undefined}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-[11px] text-[#FF453A] mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" /></svg>
                  {fieldErrors.confirmPassword}
                </p>
              )}
              {confirmPassword && !fieldErrors.confirmPassword && confirmPassword === password && (
                <p className="text-[11px] text-[#30D158] mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Passwords match
                </p>
              )}
            </div>

            {/* ── Submit ── */}
            <button
              id="signup-submit-btn"
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
                  <span>Creating Account…</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* ── Sign In Link ── */}
          <div className="text-center pt-2">
            <p className="text-xs text-[var(--text-muted)]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#0A84FF] hover:text-[#64D2FF] transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
