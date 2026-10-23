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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--border)]">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] heading-display">
          Policy Verification Registry
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1 leading-relaxed">
          Lookup and verify policy active status against the insurer local registry before claim intake
        </p>
      </div>

      {/* Lookup Card */}
      <div className="card apple-glass p-6 md:p-8 space-y-5">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="policy-search-input" className="label text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Policy Registration Number *
            </label>
            <div className="flex gap-3 mt-1">
              <div className="relative flex-1">
                <input
                  id="policy-search-input"
                  type="text"
                  placeholder="e.g. POL-2026-001 or AWASH-POL-88421"
                  className="input uppercase font-mono text-sm tracking-wide h-11"
                  value={policyNumber}
                  onChange={(e) => {
                    setPolicyNumber(e.target.value);
                    if (result) setResult(null);
                  }}
                />
              </div>
              <button
                id="policy-verify-btn"
                type="submit"
                disabled={loading || !policyNumber.trim()}
                className="btn btn-primary h-11 px-6 shadow-sm flex items-center gap-2"
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Verify Policy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Seeded Quick Fill Chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs text-[var(--text-muted)]">Sample policies:</span>
            {samplePolicies.map((num) => (
              <button
                key={num}
                type="button"
                className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 text-[#64D2FF] border border-white/10 transition-colors"
                onClick={() => handleVerify(undefined, num)}
              >
                {num}
              </button>
            ))}
          </div>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center gap-2.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Verification Result State */}
        {result && (
          <div className="pt-4 border-t border-[var(--border)]">
            {result.found ? (
              <div className="rounded-2xl p-6 bg-[#30D158]/[0.06] border border-[#30D158]/30 space-y-4 animate-fade-in-up">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#30D158]/20 border border-[#30D158]/40 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-[#30D158]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white font-mono">
                          {policyNumber.trim().toUpperCase()}
                        </h4>
                        <span className="badge text-[10px] font-bold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40">
                          {result.status}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Policy verified in insurer database
                      </p>
                    </div>
                  </div>

                  <button
                    id="proceed-claim-btn"
                    onClick={handleStartClaim}
                    className="btn btn-primary text-xs font-semibold py-2 px-4 shadow-sm"
                  >
                    Start Claim with this Policy →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] block mb-1">Policy Identifier</span>
                    <span className="font-mono text-white font-semibold">{result.policyId || "Registered"}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block mb-1">Coverage Start</span>
                    <span className="text-white font-medium">{formatDate(result.validFrom)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block mb-1">Coverage Expiry</span>
                    <span className="text-white font-medium">{formatDate(result.validTo)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-6 bg-[#FF9F0A]/[0.06] border border-[#FF9F0A]/30 space-y-3 animate-fade-in-up">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF9F0A]/20 border border-[#FF9F0A]/40 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#FF9F0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">Policy Not Found</h4>
                      <span className="badge text-[10px] font-semibold bg-[#FF9F0A]/20 text-[#FFD60A] border border-[#FF9F0A]/40">
                        NOT_FOUND
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Policy not found — verify the number. Please ensure the policy registration number matches your insurance document.
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
