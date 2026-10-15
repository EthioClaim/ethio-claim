"use client";

import type { DamageFinding, DamageSeverity, ImageQualityResult } from "@/types";
import { getSeverityColor, getQualityColor } from "@/lib/utils";

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value > 0.85 ? "#30D158" : value > 0.7 ? "#FF9F0A" : "#FF453A";
  return (
    <div className="flex items-center gap-2.5 flex-1">
      <div className="progress-bar flex-1" style={{ maxWidth: "80px", height: "5px" }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold font-mono" style={{ color }}>{pct}%</span>
    </div>
  );
}

export function DamageFindings({ findings }: { findings: DamageFinding[] }) {
  return (
    <div className="card apple-glass">
      <div className="px-5 py-4.5 border-b border-[var(--border)] flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em] leading-snug mb-1">
            Computer Vision Damage Localization
          </h3>
          <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed">
            Automated bounding box detection on vehicle panels
          </p>
        </div>
        <span 
          className="badge" 
          style={{ 
            background: "rgba(255, 159, 10, 0.12)", 
            color: "#FF9F0A", 
            border: "1px solid rgba(255, 159, 10, 0.28)" 
          }}
        >
          {findings.length} detected
        </span>
      </div>

      {findings.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">
          No external vehicle damage findings detected by model
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          <div className="grid grid-cols-4 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] bg-white/[0.02]">
            <span>Vehicle Part</span>
            <span>Damage Type</span>
            <span>Severity</span>
            <span>Confidence</span>
          </div>
          {findings.map((f) => (
            <div 
              key={f.id} 
              className="grid grid-cols-4 items-center px-5 py-3.5 hover:bg-white/[0.04] transition-colors duration-200"
            >
              <span className="text-xs font-semibold text-white tracking-tight">{f.part}</span>
              <span className="text-xs capitalize text-[var(--text-secondary)]">{f.damageType}</span>
              <span className={`text-xs font-bold ${getSeverityColor(f.severity)}`}>{f.severity}</span>
              <ConfidenceBar value={f.confidence} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ImageQualityResults({ results }: { results: ImageQualityResult[] }) {
  return (
    <div className="card apple-glass">
      <div className="px-5 py-4.5 border-b border-[var(--border)]">
        <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em] leading-snug mb-1">
          Image Inspection Quality Assurance
        </h3>
        <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed">
          Blur, lighting, glare, and resolution automated checks
        </p>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {results.map((r) => (
          <div key={r.evidenceId} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.05] border border-white/10">
                <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-mono font-medium text-white">{r.filename}</span>
                {r.note && <span className="text-[11px] text-[var(--text-muted)] ml-2">({r.note})</span>}
              </div>
            </div>
            <span 
              className={`badge text-[11px] font-bold ${getQualityColor(r.quality)}`}
              style={{
                background: r.quality === "PASS" ? "rgba(48, 209, 88, 0.12)" : r.quality === "LOW_CONFIDENCE" ? "rgba(255, 159, 10, 0.12)" : "rgba(255, 69, 58, 0.12)",
                border: `1px solid ${r.quality === "PASS" ? "rgba(48, 209, 88, 0.28)" : r.quality === "LOW_CONFIDENCE" ? "rgba(255, 159, 10, 0.28)" : "rgba(255, 69, 58, 0.28)"}`,
              }}
            >
              {r.quality}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
