"use client";

import type { SimilarityResult, ConsistencyResult, DocumentExtraction } from "@/types";

export function SimilarityResults({ results }: { results: SimilarityResult[] }) {
  const signalConfig = {
    REVIEW:      { color: "#FF9F0A", bg: "rgba(255,159,10,0.12)",  border: "rgba(255,159,10,0.3)"  },
    INVESTIGATE: { color: "#FF453A", bg: "rgba(255,69,58,0.12)",   border: "rgba(255,69,58,0.3)"   },
    OK:          { color: "#30D158", bg: "rgba(48,209,88,0.12)",  border: "rgba(48,209,88,0.3)"  },
  };

  return (
    <div className="card apple-glass">
      <div className="px-5 py-4.5 border-b border-[var(--border)] flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em] leading-snug mb-1">
            Historical Evidence Similarity Match
          </h3>
          <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed">
            Vector similarity across national insurance repositories
          </p>
        </div>
        <span 
          className="badge" 
          style={{ 
            background: "rgba(191,90,242,0.12)", 
            color: "#BF5AF2", 
            border: "1px solid rgba(191,90,242,0.3)" 
          }}
        >
          Vector Search
        </span>
      </div>

      {results.length === 0 ? (
        <div className="px-5 py-8 text-sm text-center text-[var(--text-muted)]">
          No matching historical evidence or duplicate damage photos found
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {results.map((r) => {
            const sc = signalConfig[r.signal];
            const pct = Math.round(r.similarityScore * 100);
            return (
              <div key={r.id} className="px-5 py-4 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#64D2FF]">
                      {r.matchedClaimNumber}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] ml-2">Matched Historical Record</span>
                  </div>
                  <span className="badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                    {r.signal}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="progress-bar flex-1" style={{ maxWidth: "120px", height: "6px" }}>
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${pct}%`, background: sc.color }}
                    />
                  </div>
                  <span className="text-xs font-bold font-mono" style={{ color: sc.color }}>{pct}% similarity</span>
                </div>
                <p className="text-[11px] mt-2 text-[var(--text-muted)]">
                  ⚠️ High similarity is an automated signal for investigator triage — not conclusive proof of fraud.
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ConsistencyResults({ result }: { result: ConsistencyResult }) {
  const levelConfig = {
    "LOW":         { color: "#FF453A", bg: "rgba(255,69,58,0.12)",   border: "rgba(255,69,58,0.3)"   },
    "MEDIUM":      { color: "#FF9F0A", bg: "rgba(255,159,10,0.12)",  border: "rgba(255,159,10,0.3)"  },
    "MEDIUM-HIGH": { color: "#FF9F0A", bg: "rgba(255,159,10,0.12)",  border: "rgba(255,159,10,0.3)"  },
    "HIGH":        { color: "#30D158", bg: "rgba(48,209,88,0.12)",  border: "rgba(48,209,88,0.3)"  },
  };
  const findingConfig = {
    INFO:     { color: "#0A84FF", icon: "ℹ" },
    WARN:     { color: "#FF9F0A", icon: "⚠" },
    CONFLICT: { color: "#FF453A", icon: "✗" },
  };
  const lc = levelConfig[result.level];

  return (
    <div className="card apple-glass" style={{ border: `1px solid ${lc.border}` }}>
      <div className="px-5 py-4.5 border-b border-[var(--border)] flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em] leading-snug mb-1">
            Evidence Cross-Validation Consistency
          </h3>
          <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed">
            Police report vs estimate vs photo timeline checks
          </p>
        </div>
        <span className="badge font-bold" style={{ background: lc.bg, color: lc.color, border: `1px solid ${lc.border}` }}>
          {result.level} CONSISTENCY
        </span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {result.findings.map((f, i) => {
          const fc = findingConfig[f.severity];
          return (
            <div key={i} className="px-5 py-3.5 hover:bg-white/[0.03] transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-sm font-bold flex-shrink-0" style={{ color: fc.color }}>{fc.icon}</span>
                <div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] mb-1">
                    {f.source1} ↔ {f.source2}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">{f.observation}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ExtractedFields({ extractions }: { extractions: DocumentExtraction[] }) {
  return (
    <div className="card apple-glass">
      <div className="px-5 py-4.5 border-b border-[var(--border)]">
        <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em] leading-snug mb-1">
          Automated Document OCR Extractions
        </h3>
        <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed">
          Parsed entity fields from vehicle certificates & police report
        </p>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {extractions.map((e) => {
          const pct = Math.round(e.confidence * 100);
          const color = e.confidence > 0.9 ? "#30D158" : e.confidence > 0.75 ? "#FF9F0A" : "#FF453A";
          return (
            <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.03] transition-colors">
              <div>
                <div className="text-[11px] text-[var(--text-muted)] mb-0.5">{e.field}</div>
                <div className="text-xs font-mono font-semibold text-white">{e.value}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold" style={{ color }}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
