"use client";

import type { SimilarityMatch, SimilarityMatchType } from "@/types";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

const MATCH_TYPE_CONFIG: Record<
  SimilarityMatchType,
  { label: string; badge: string; color: string; desc: string }
> = {
  EXACT_HASH: {
    label: "SHA-256 Exact Duplicate",
    badge: "bg-[#FF453A]/15 text-[#FF6961] border border-[#FF453A]/30",
    color: "#FF453A",
    desc: "Byte-identical file match with historical evidence",
  },
  PERCEPTUAL_HASH: {
    label: "pHash Near-Duplicate",
    badge: "bg-[#FF9F0A]/15 text-[#FFD60A] border border-[#FF9F0A]/30",
    color: "#FF9F0A",
    desc: "Low Hamming distance perceptual image match",
  },
  NEAR_DUPLICATE: {
    label: "pHash Near-Duplicate",
    badge: "bg-[#FF9F0A]/15 text-[#FFD60A] border border-[#FF9F0A]/30",
    color: "#FF9F0A",
    desc: "Perceptual hash match with low Hamming distance",
  },
  EMBEDDING_SIMILARITY: {
    label: "Visual Neighbor Search",
    badge: "bg-[#0A84FF]/15 text-[#64D2FF] border border-[#0A84FF]/30",
    color: "#64D2FF",
    desc: "Dense vector visual embedding cosine similarity",
  },
  VISUAL_SIMILARITY: {
    label: "Visual Vector Match",
    badge: "bg-[#0A84FF]/15 text-[#64D2FF] border border-[#0A84FF]/30",
    color: "#64D2FF",
    desc: "Vector embedding cosine similarity search",
  },
};

export function SimilarityResults({ matches }: { matches: SimilarityMatch[] }) {
  const actionableFraudMatches = matches.filter((m) => {
    if (m.matchType === "EXACT_HASH") return true;
    if (m.matchType === "NEAR_DUPLICATE" || m.matchType === "PERCEPTUAL_HASH") return true;
    if (m.score !== undefined && Number(m.score) >= 0.85) return true;
    return false;
  });

  const subThresholdVisualMatches = matches.filter((m) => {
    const isVisual = m.matchType === "VISUAL_SIMILARITY" || m.matchType === "EMBEDDING_SIMILARITY";
    return isVisual && m.score !== undefined && Number(m.score) < 0.85;
  });

  const hasHighFraud = actionableFraudMatches.length > 0;
  const hasSubThresholdOnly = !hasHighFraud && subThresholdVisualMatches.length > 0;

  return (
    <div className="card apple-glass overflow-hidden border border-white/10 shadow-lg">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-4 bg-white/[0.015]">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.018em] leading-snug">
              Historical Evidence & Candidate Matches
            </h3>
            <span className="badge text-[10px] font-mono bg-white/[0.06] text-white/80 border border-white/10 px-2 py-0.5 rounded-full">
              Cross-Claim Vault
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed mt-0.5">
            Exact file hash, perceptual hash, and visual embedding matches across archive (85% vector threshold enforced)
          </p>
        </div>
        <span
          className="badge text-[11px] font-semibold px-2.5 py-1 rounded-full font-mono"
          style={{
            background: hasHighFraud
              ? "rgba(255, 69, 58, 0.14)"
              : hasSubThresholdOnly
              ? "rgba(10, 132, 255, 0.14)"
              : "rgba(48, 209, 88, 0.14)",
            color: hasHighFraud ? "#FF453A" : hasSubThresholdOnly ? "#64D2FF" : "#30D158",
            border: `1px solid ${
              hasHighFraud
                ? "rgba(255, 69, 58, 0.3)"
                : hasSubThresholdOnly
                ? "rgba(10, 132, 255, 0.3)"
                : "rgba(48, 209, 88, 0.3)"
            }`,
          }}
        >
          {hasHighFraud
            ? `${actionableFraudMatches.length} fraud flag(s)`
            : hasSubThresholdOnly
            ? `${subThresholdVisualMatches.length} below 85% threshold (non-fraud)`
            : `${matches.length} candidate(s)`}
        </span>
      </div>

      {matches.length === 0 ? (
        <div className="px-5 py-12 text-center text-xs text-[var(--text-muted)] space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mx-auto text-xl text-[#30D158] mb-2 shadow-inner">
            ✓
          </div>
          <p className="font-semibold text-white/95 text-sm">No Candidate Cross-Claim Matches</p>
          <p className="text-[12px] text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
            No exact SHA-256 byte duplicates, pHash near-duplicates, or embedding neighbors found in insurer historical claim vaults.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {matches.map((m, idx) => {
            const isVisual = m.matchType === "VISUAL_SIMILARITY" || m.matchType === "EMBEDDING_SIMILARITY";
            const scoreNum = m.score !== undefined ? Number(m.score) : undefined;
            const isSubThresholdVisual = isVisual && scoreNum !== undefined && scoreNum < 0.85;
            const isHighVisual = isVisual && scoreNum !== undefined && scoreNum >= 0.85;

            const conf = MATCH_TYPE_CONFIG[m.matchType] || {
              label: m.matchType,
              badge: "bg-white/10 text-white border border-white/20",
              color: "#64D2FF",
              desc: "Candidate match",
            };

            const scoreDisplay =
              scoreNum !== undefined
                ? `${Math.round(scoreNum * 100)}% match`
                : m.distance !== undefined
                ? `Distance: ${m.distance}`
                : "Matched";

            return (
              <div
                key={m.id || `match-${idx}-${m.matchedEvidenceId || m.matchedClaimId || idx}`}
                className="px-5 py-4 hover:bg-white/[0.03] transition-colors duration-150 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`badge text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isSubThresholdVisual
                          ? "bg-[#0A84FF]/12 text-[#64D2FF] border border-[#0A84FF]/30"
                          : isHighVisual
                          ? "bg-[#FF453A]/15 text-[#FF6961] border border-[#FF453A]/30"
                          : conf.badge
                      }`}
                    >
                      {isSubThresholdVisual
                        ? "Visual Vector Candidate (< 85% Threshold)"
                        : isHighVisual
                        ? "High Visual Vector Match (>= 85%)"
                        : conf.label}
                    </span>
                    {m.matchedClaimNumber && (
                      <Link
                        href={`/claims/${m.matchedClaimId || m.matchedClaimNumber}`}
                        className="text-xs font-mono font-bold text-[#64D2FF] hover:underline"
                      >
                        Claim #{m.matchedClaimNumber}
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-mono font-bold"
                      style={{
                        color: isSubThresholdVisual
                          ? "#64D2FF"
                          : isHighVisual
                          ? "#FF453A"
                          : conf.color,
                      }}
                    >
                      {scoreDisplay}
                    </span>
                    {isSubThresholdVisual && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-[var(--text-muted)] border border-white/10">
                        Non-Fraud
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-[var(--text-muted)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span>
                      {isSubThresholdVisual
                        ? "Match score is below 85% threshold. Visual vector match alone does not classify this evidence as fraud."
                        : conf.desc}
                    </span>
                    {m.createdAt && <span className="font-mono text-[11px]">Indexed {formatDateTime(m.createdAt)}</span>}
                  </div>
                  {isSubThresholdVisual && (
                    <p className="text-[11px] text-[#64D2FF]/80">
                      Evaluated via alternative metrics: Exact SHA-256 (None) • pHash (None) • Damage check.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-5 py-3 border-t border-[var(--border)] bg-white/[0.015] text-[11px] text-[var(--text-muted)] flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-[#0A84FF] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Policy rule: Visual vector matches under 85% are not classified as fraud. Alternative deterministic signals (pHash, exact SHA-256, damage detection) govern final risk assessment.
        </span>
      </div>
    </div>
  );
}
