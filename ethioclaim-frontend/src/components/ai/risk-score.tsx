"use client";

import type { RiskAssessment, RiskLevel } from "@/types";

const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string; border: string; glow: string; label: string }> = {
  LOW:      { color: "#10b981", bg: "rgba(16,185,129,0.08)",   border: "rgba(16,185,129,0.25)",  glow: "rgba(16,185,129,0.15)",  label: "Low Risk" },
  MEDIUM:   { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",   border: "rgba(245,158,11,0.25)",  glow: "rgba(245,158,11,0.15)",  label: "Medium Risk" },
  HIGH:     { color: "#f97316", bg: "rgba(249,115,22,0.08)",   border: "rgba(249,115,22,0.25)",  glow: "rgba(249,115,22,0.15)",  label: "High Risk" },
  CRITICAL: { color: "#a855f7", bg: "rgba(168,85,247,0.08)",   border: "rgba(168,85,247,0.25)",  glow: "rgba(168,85,247,0.15)",  label: "Critical Risk" },
};

export function RiskScore({ assessment }: { assessment: RiskAssessment }) {
  const conf = RISK_CONFIG[assessment.riskLevel];
  const pct = assessment.riskScore;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="card p-5" style={{ border: `1px solid ${conf.border}`, boxShadow: `0 4px 24px ${conf.glow}` }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">AI Risk Assessment</h3>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>v{assessment.modelVersion.split("-").slice(-1)}</span>
      </div>

      {/* Circular progress */}
      <div className="flex items-center gap-6 mb-4">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-elevated)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="45"
              fill="none" stroke={conf.color}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 6px ${conf.color})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: conf.color, fontFamily: "Space Grotesk" }}>
              {pct}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>/ 100</span>
          </div>
        </div>

        <div>
          <div className="text-lg font-bold mb-1" style={{ color: conf.color, fontFamily: "Space Grotesk" }}>
            {conf.label}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Triage priority — not a fraud determination
          </div>
        </div>
      </div>

      {/* Reason codes */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
          Reason Codes
        </div>
        <div className="space-y-1.5">
          {assessment.reasonCodes.map((rc, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: conf.color }} />
              <span style={{ color: "var(--text-secondary)" }}>{rc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        ⚠️ This is an investigation recommendation. Not a fraud determination or final claim decision.
      </div>
    </div>
  );
}
