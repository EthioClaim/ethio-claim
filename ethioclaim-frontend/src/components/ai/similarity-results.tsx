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
    badge: "bg-[#BF5AF2]/15 text-[#E39FF6] border border-[#BF5AF2]/30",
    color: "#BF5AF2",
    desc: "Dense vector visual embedding cosine similarity",
  },
  VISUAL_SIMILARITY: {
    label: "Visual Vector Match",
    badge: "bg-[#BF5AF2]/15 text-[#E39FF6] border border-[#BF5AF2]/30",
    color: "#BF5AF2",
    desc: "High cosine similarity in vector embedding space",
  },
};

export function SimilarityResults({ matches }: { matches: SimilarityMatch[] }) {
  return (
    <div className="card apple-glass overflow-hidden">
      <div className="px-5 py-4.5 border-b border-[var(--border)] flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em] leading-snug">
              Historical Evidence & Candidate Matches
            </h3>
            <span className="badge text-[10px] bg-white/10 text-white/70 border border-white/10">
              Cross-Claim
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed mt-0.5">
            Exact file hash, perceptual hash, and visual embedding matches across archive
          </p>
        </div>
        <span
          className="badge"
          style={{
            background: matches.length > 0 ? "rgba(255, 69, 58, 0.12)" : "rgba(48, 209, 88, 0.12)",
            color: matches.length > 0 ? "#FF6961" : "#30D158",
            border: `1px solid ${matches.length > 0 ? "rgba(255, 69, 58, 0.3)" : "rgba(48, 209, 88, 0.3)"}`,
          }}
        >
          {matches.length} {matches.length === 1 ? "candidate" : "candidates"}
        </span>
      </div>

      {matches.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)] space-y-1">
          <p className="font-semibold text-white/80">No Candidate Matches Detected</p>
          <p className="text-xs">
            No exact SHA-256 byte duplicates, pHash near-duplicates, or embedding neighbors found.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {matches.map((m) => {
            const conf = MATCH_TYPE_CONFIG[m.matchType] || {
              label: m.matchType,
              badge: "bg-white/10 text-white border border-white/20",
              color: "#64D2FF",
              desc: "Candidate match",
            };

            const scoreDisplay =
              m.score !== undefined
                ? `${Math.round(m.score * 100)}% match`
                : m.distance !== undefined
                ? `Distance: ${m.distance}`
                : "Matched";

            return (
              <div
                key={m.id}
                className="px-5 py-4 hover:bg-white/[0.03] transition-colors flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className={`badge text-[11px] font-semibold ${conf.badge}`}>
                      {conf.label}
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
                    <span className="text-xs font-mono font-bold" style={{ color: conf.color }}>
                      {scoreDisplay}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{conf.desc}</span>
                  {m.createdAt && <span>Indexed {formatDateTime(m.createdAt)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-5 py-3 border-t border-[var(--border)] bg-white/[0.02] text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-[#FF9F0A] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Similarity scores are investigative ranking signals for the examiner, not definitive determinations of fraud.
        </span>
      </div>
    </div>
  );
}
