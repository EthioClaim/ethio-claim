"use client";

import type { SimilarityResult, ConsistencyResult, DocumentExtraction } from "@/types";

export function SimilarityResults({ results }: { results: SimilarityResult[] }) {
  const signalConfig = {
    REVIEW:      { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)"  },
    INVESTIGATE: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)"   },
    OK:          { color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)"  },
  };

  return (
    <div className="card">
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold">Historical Evidence Similarity</h3>
        <span className="badge" style={{ background: "rgba(139,92,246,0.1)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)" }}>
          Image Search
        </span>
      </div>
      {results.length === 0 ? (
        <div className="px-5 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
          No similar historical evidence found
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {results.map((r) => {
            const sc = signalConfig[r.signal];
            const pct = Math.round(r.similarityScore * 100);
            return (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium" style={{ color: "#93c5fd" }}>
                      {r.matchedClaimNumber}
                    </span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>Matched claim</span>
                  </div>
                  <span className="badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                    {r.signal}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="progress-bar flex-1" style={{ maxWidth: "120px" }}>
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${pct}%`, background: sc.color, height: "8px" }}
                    />
                  </div>
                  <span className="text-sm font-bold" style={{ color: sc.color }}>{pct}% similarity</span>
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  ⚠️ High similarity is an investigation signal only — not evidence of fraud.
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
    "LOW":         { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)"   },
    "MEDIUM":      { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)"  },
    "MEDIUM-HIGH": { color: "#f97316", bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.2)"  },
    "HIGH":        { color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)"  },
  };
  const findingConfig = {
    INFO:    { color: "#3b82f6", icon: "ℹ" },
    WARN:    { color: "#f59e0b", icon: "⚠" },
    CONFLICT:{ color: "#ef4444", icon: "✗" },
  };
  const lc = levelConfig[result.level];

  return (
    <div className="card" style={{ border: `1px solid ${lc.border}` }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold">Evidence Consistency</h3>
        <span className="badge font-bold" style={{ background: lc.bg, color: lc.color, border: `1px solid ${lc.border}` }}>
          {result.level}
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {result.findings.map((f, i) => {
          const fc = findingConfig[f.severity];
          return (
            <div key={i} className="px-5 py-3">
              <div className="flex items-start gap-3">
                <span className="text-base flex-shrink-0" style={{ color: fc.color }}>{fc.icon}</span>
                <div>
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    {f.source1} ↔ {f.source2}
                  </div>
                  <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{f.observation}</div>
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
    <div className="card">
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold">Document Extraction (OCR)</h3>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {extractions.map((e) => {
          const pct = Math.round(e.confidence * 100);
          const color = e.confidence > 0.9 ? "#10b981" : e.confidence > 0.75 ? "#f59e0b" : "#ef4444";
          return (
            <div key={e.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{e.field}</div>
                <div className="text-sm font-medium font-mono">{e.value}</div>
              </div>
              <span className="text-xs font-semibold" style={{ color }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
