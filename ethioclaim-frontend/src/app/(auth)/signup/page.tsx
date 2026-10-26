"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register, checkHealth, getStoredToken } from "@/lib/api";

type RoleOption = "EXAMINER" | "ADMIN" | "INTAKE_USER";

const ROLE_META: Record<RoleOption, { label: string; description: string; color: string; badge: string }> = {
  EXAMINER: {
    label: "Claims Examiner",
    description: "Review evidence, inspect vehicle damage findings, and record binding adjudication determinations",
    color: "#0A84FF",
    badge: "bg-[#0A84FF]/15 text-[#64D2FF] border-[#0A84FF]/30",
  },
  INTAKE_USER: {
    label: "Intake Officer",
    description: "Initiate motor claims, verify insurer policy records, and submit damage evidence photos",
    color: "#30D158",
    badge: "bg-[#30D158]/15 text-[#70E08B] border-[#30D158]/30",
  },
  ADMIN: {
    label: "System Admin",
    description: "Manage staff accounts, policy registry oversight, operations telemetry & tamper-evident audit logs",
    color: "#BF5AF2",
    badge: "bg-[#BF5AF2]/15 text-[#E39FF6] border-[#BF5AF2]/30",
  },
};

export default function SignupPage() {
  const router = useRouter();
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
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[#0A84FF]/25 selection:text-[#64D2FF] overflow-hidden py-10">
      {/* ── Apple Ambient Background Specular Blooms ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-[15%] right-[20%] w-[620px] h-[620px] rounded-full opacity-[0.14] blur-[140px]"
          style={{ background: "radial-gradient(circle, #0A84FF 0%, #64D2FF 55%, transparent 100%)" }}
        />
        <div
          className="absolute bottom-[10%] left-[15%] w-[540px] h-[540px] rounded-full opacity-[0.09] blur-[130px]"
          style={{ background: "radial-gradient(circle, #30D158 0%, #64D2FF 50%, transparent 100%)" }}
        />
      </div>

      {/* ── Main Container Glass Card ── */}
      <div
        className="relative z-10 w-full max-w-[540px] card apple-glass p-7 sm:p-9 space-y-6"
        style={{
          borderRadius: "28px",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Link href="/login" className="flex items-center gap-2 group">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden group-hover:scale-105 transition-transform"
              style={{
                background: "linear-gradient(145deg, #0A84FF 0%, #0060DF 65%, #64D2FF 100%)",
                boxShadow: "0 6px 20px rgba(10, 132, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
              }}
            >
              <svg className="w-6 h-6 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-[-0.03em] heading-display">
              Create Staff Account
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto leading-relaxed">
              Register for authorized access to the EthioClaim insurance portal
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-[#FF453A]/12 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center gap-2.5 animate-fade-in">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Full Name *
            </label>
            <input
              type="text"
              required
              className={`input text-sm h-11 ${fieldErrors.fullName ? "border-[#FF453A]" : ""}`}
              placeholder="e.g. Almaz Bekele"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: "" });
              }}
            />
            {fieldErrors.fullName && (
              <span className="text-[11px] text-[#FF453A] mt-1 block">{fieldErrors.fullName}</span>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Work Email Address *
            </label>
            <input
              type="email"
              required
              className={`input text-sm h-11 ${fieldErrors.email ? "border-[#FF453A]" : ""}`}
              placeholder="almaz@insurer.et"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
              }}
            />
            {fieldErrors.email && (
              <span className="text-[11px] text-[#FF453A] mt-1 block">{fieldErrors.email}</span>
            )}
          </div>

          {/* Role Selection Segmented Grid */}
          <div>
            <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Assigned Operational Role *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(Object.keys(ROLE_META) as RoleOption[]).map((r) => {
                const meta = ROLE_META[r];
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`p-3 rounded-2xl border text-left transition-all duration-200 select-none flex flex-col justify-between ${
                      isSelected
                        ? "bg-white/[0.08] border-[#0A84FF] shadow-xs"
                        : "bg-white/[0.03] border-white/8 hover:bg-white/[0.06] hover:border-white/14"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-white">{meta.label}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#0A84FF]" />
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-tight">
                        {meta.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Password & Confirm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Password *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                className={`input text-sm h-11 ${fieldErrors.password ? "border-[#FF453A]" : ""}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" });
                }}
              />
              {fieldErrors.password && (
                <span className="text-[11px] text-[#FF453A] mt-1 block">{fieldErrors.password}</span>
              )}
            </div>

            <div>
              <label className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Confirm Password *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                className={`input text-sm h-11 ${fieldErrors.confirmPassword ? "border-[#FF453A]" : ""}`}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: "" });
                }}
              />
              {fieldErrors.confirmPassword && (
                <span className="text-[11px] text-[#FF453A] mt-1 block">{fieldErrors.confirmPassword}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-[#0A84FF] focus:ring-0"
              />
              <span>Show password</span>
            </label>
            <span className="font-mono text-[10px]">Min 6 characters</span>
          </div>

          {/* Submit Button */}
          <button
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
                <span>Creating Account…</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Register Staff Account</span>
              </>
            )}
          </button>

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
        </form>
      </div>
    </div>
  );
}
