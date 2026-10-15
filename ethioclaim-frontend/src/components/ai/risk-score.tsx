"use client";

import type { RiskAssessment, RiskLevel } from "@/types";

const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string; border: string; glow: string; label: string }> = {
  LOW:      { color: "#30D158", bg: "rgba(48,209,88,0.1)",   border: "rgba(48,209,88,0.3)",   glow: "rgba(48,209,88,0.18)",   label: "Low Fraud Risk" },
  MEDIUM:   { color: "#FF9F0A", bg: "rgba(255,159,10,0.1)",  border: "rgba(255,159,10,0.3)",  glow: "rgba(255,159,10,0.18)",  label: "Moderate Risk" },
  HIGH:     { color: "#FF453A", bg: "rgba(255,69,58,0.1)",   border: "rgba(255,69,58,0.3)",   glow: "rgba(255,69,58,0.18)",   label: "Elevated Risk" },
  CRITICAL: { color: "#BF5AF2", bg: "rgba(191,90,242,0.1)",  border: "rgba(191,90,242,0.3)",  glow: "rgba(191,90,242,0.18)",  label: "Critical Risk Flag" },
};

export function RiskScore({ assessment }: { assessment: RiskAssessment }) {
  const conf = RISK_CONFIG[assessment.riskLevel];
  const pct = assessment.riskScore;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div 
      className="card apple-glass p-6" 
      style={{ 
        border: `1px solid ${conf.border}`, 
        boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 8px 32px ${conf.glow}` 
      }}
    >
      <div className="flex items-center justify-between mb-5 gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em] leading-snug mb-1">
            AI Fraud Risk Assessment
          </h3>
          <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed">
            Ensemble scoring across behavioral, claim & damage features
          </p>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/10 text-[var(--text-secondary)] border border-white/10 flex-shrink-0">
          v{assessment.modelVersion.split("-").slice(-1)}
        </span>
      </div>

      {/* Circular Progress Gauge with Apple Spring Ease */}
      <div className="flex items-center gap-6 mb-5">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="45"
              fill="none" stroke={conf.color}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ 
                transition: "stroke-dashoffset 1.2s var(--spring-crit)", 
                filter: `drop-shadow(0 0 8px ${conf.color})` 
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold tracking-[-0.035em]" style={{ color: conf.color }}>
              {pct}
            </span>
            <span className="text-[11px] font-medium text-[var(--text-muted)]">/ 100</span>
          </div>
        </div>

        <div>
          <div className="text-lg font-bold tracking-tight mb-1" style={{ color: conf.color }}>
            {conf.label}
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Prioritized automated routing indicator. Not a definitive legal fraud verdict.
          </p>
        </div>
      </div>

      {/* Reason Codes Pill List */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-3 text-[var(--text-muted)]">
          Contributing Risk Factors
        </div>
        <div className="space-y-2.5">
          {assessment.reasonCodes.map((rc, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: conf.color }} />
              <span className="text-[var(--text-secondary)] font-medium leading-relaxed">{rc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
        <span>ℹ️</span>
        <span>Decision recommendation for insurance examiners according to NBE compliance guidelines.</span>
      </div>
    </div>
  );
}
