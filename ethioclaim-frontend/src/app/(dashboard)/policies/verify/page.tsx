"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyPolicy } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { PolicyVerificationResult } from "@/types";

export default function PolicyVerificationPage() {
  const router = useRouter();
  const [policyNumber, setPolicyNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PolicyVerificationResult | null>(null);
  const [error, setError] = useState("");

  const samplePolicies = ["POL-2026-001", "POL-2025-88421", "AWASH-POL-902", "ETHIO-COMP-4401"];

  async function handleVerify(e?: React.FormEvent, customNumber?: string) {
    if (e) e.preventDefault();
    const query = (customNumber || policyNumber).trim();
    if (!query) {
      setError("Please enter a policy number to verify");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await verifyPolicy(query);
      setResult(res);
      if (customNumber) setPolicyNumber(customNumber);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed. Check network or API.");
    } finally {
      setLoading(false);
    }
  }

  function handleStartClaim() {
    if (result && result.found) {
      router.push(`/claims/new?policyNumber=${encodeURIComponent(policyNumber.trim().toUpperCase())}`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-7 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--border)]">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.032em] heading-display">
          Policy Verification Registry
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
          Lookup and verify motor policy validity against the insurer local registry before claim intake
        </p>
      </div>

      {/* Lookup Card */}
      <div className="card apple-glass p-6 sm:p-8 space-y-6">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="policy-search-input" className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Policy Registration Number *
            </label>
            <div className="flex flex-col sm:flex-row gap-3 mt-1.5">
              <div className="relative flex-1">
                <input
                  id="policy-search-input"
                  type="text"
                  placeholder="e.g. POL-2026-001 or AWASH-POL-902"
                  className="input uppercase font-mono text-sm tracking-wide h-12 pl-10"
                  value={policyNumber}
                  onChange={(e) => {
                    setPolicyNumber(e.target.value);
                    if (result) setResult(null);
                  }}
                />
                <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <button
                id="policy-verify-btn"
                type="submit"
                disabled={loading || !policyNumber.trim()}
                className="btn btn-primary h-12 px-7 shadow-sm flex items-center justify-center gap-2 font-semibold"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Verifying…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Verify Policy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Seeded Quick Fill Chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">Sample policies:</span>
            {samplePolicies.map((num) => (
              <button
                key={num}
                type="button"
                className="text-xs font-mono px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-[#64D2FF] border border-white/8 transition-all"
                onClick={() => handleVerify(undefined, num)}
              >
                {num}
              </button>
            ))}
          </div>
        </form>

        {error && (
          <div className="p-4 rounded-2xl bg-[#FF453A]/12 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center gap-2.5 animate-fade-in">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Verification Result State */}
        {result && (
          <div className="pt-4 border-t border-[var(--border)]">
            {result.found ? (
              <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-[#30D158]/[0.08] to-transparent border border-[#30D158]/35 space-y-5 animate-fade-in-up shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#30D158]/20 border border-[#30D158]/40 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <svg className="w-6 h-6 text-[#30D158]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h4 className="text-lg font-bold text-white font-mono tracking-tight">
                          {policyNumber.trim().toUpperCase()}
                        </h4>
                        <span className="badge text-[11px] font-bold bg-[#30D158]/25 text-[#30D158] border border-[#30D158]/50 shadow-xs">
                          {result.status || "ACTIVE"}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Policy record verified and active in insurer registry
                      </p>
                    </div>
                  </div>

                  <button
                    id="proceed-claim-btn"
                    onClick={handleStartClaim}
                    className="btn btn-primary text-xs font-semibold py-2.5 px-5 shadow-sm ml-auto"
                  >
                    Start Claim with this Policy →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
                  <div className="space-y-1">
                    <span className="text-[var(--text-muted)] block text-[11px] uppercase tracking-wider font-semibold">Policy Identifier</span>
                    <span className="font-mono text-white font-semibold text-sm">{result.policyId || "POL-REG-OK"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[var(--text-muted)] block text-[11px] uppercase tracking-wider font-semibold">Coverage Start</span>
                    <span className="text-white font-medium text-sm">{formatDate(result.validFrom)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[var(--text-muted)] block text-[11px] uppercase tracking-wider font-semibold">Coverage Expiry</span>
                    <span className="text-white font-medium text-sm">{formatDate(result.validTo)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-[#FF9F0A]/[0.08] to-transparent border border-[#FF9F0A]/35 space-y-4 animate-fade-in-up">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#FF9F0A]/20 border border-[#FF9F0A]/40 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg className="w-6 h-6 text-[#FF9F0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-base font-bold text-white">Policy Record Not Located</h4>
                      <span className="badge text-[10px] font-semibold bg-[#FF9F0A]/20 text-[#FFD60A] border border-[#FF9F0A]/40">
                        NOT_FOUND
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Policy number &ldquo;{policyNumber}&rdquo; could not be verified in the active registry. Please check the insurance certificate or contact your insurer administrator.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
