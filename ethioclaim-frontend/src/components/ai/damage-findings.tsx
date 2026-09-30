"use client";

import type { DamageFinding, DamageSeverity, ImageQualityResult } from "@/types";
import { getSeverityColor, getQualityColor, formatConfidence } from "@/lib/utils";

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value > 0.85 ? "#10b981" : value > 0.7 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="progress-bar flex-1" style={{ maxWidth: "80px" }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium" style={{ color }}>{pct}%</span>
    </div>
  );
}

export function DamageFindings({ findings }: { findings: DamageFinding[] }) {
  return (
    <div className="card">
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold">Damage Findings</h3>
        <span className="badge" style={{ background: "rgba(249,115,22,0.1)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.2)" }}>
          {findings.length} detected
        </span>
      </div>
      {findings.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          No damage findings detected
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-4 px-5 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>
            <span>Part</span>
            <span>Type</span>
            <span>Severity</span>
            <span>Confidence</span>
          </div>
          {findings.map((f) => (
            <div key={f.id} className="grid grid-cols-4 items-center px-5 py-3 border-t transition-colors"
              style={{ borderColor: "var(--border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
              <span className="text-sm font-medium">{f.part}</span>
              <span className="text-sm capitalize" style={{ color: "var(--text-secondary)" }}>{f.damageType}</span>
              <span className={`text-sm font-medium ${getSeverityColor(f.severity)}`}>{f.severity}</span>
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
    <div className="card">
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold">Image Quality Check</h3>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {results.map((r) => (
          <div key={r.evidenceId} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-mono">{r.filename}</span>
              {r.note && <span className="text-xs" style={{ color: "var(--text-muted)" }}>({r.note})</span>}
            </div>
            <span className={`badge text-xs font-semibold ${getQualityColor(r.quality)}`}
              style={{
                background: r.quality === "PASS" ? "rgba(16,185,129,0.1)" : r.quality === "LOW_CONFIDENCE" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${r.quality === "PASS" ? "rgba(16,185,129,0.3)" : r.quality === "LOW_CONFIDENCE" ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}>
              {r.quality}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
