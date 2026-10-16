"use client";

import type { DamageDetection } from "@/types";
import { formatConfidence, getSeverityColor } from "@/lib/utils";

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value > 0.85 ? "#30D158" : value > 0.7 ? "#FF9F0A" : "#64D2FF";
  return (
    <div className="flex items-center gap-2.5 flex-1">
      <div className="progress-bar flex-1" style={{ maxWidth: "80px", height: "5px" }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold font-mono" style={{ color }}>
        {formatConfidence(value)}
      </span>
    </div>
  );
}

export function DamageFindings({
  detections,
  modelInfo,
}: {
  detections: DamageDetection[];
  modelInfo?: { modelName?: string; modelVersion?: string };
}) {
  return (
    <div className="card apple-glass overflow-hidden">
      <div className="px-5 py-4.5 border-b border-[var(--border)] flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em] leading-snug">
              Computer Vision Damage Detections
            </h3>
            {modelInfo?.modelVersion && (
              <span className="badge text-[10px] font-mono bg-white/10 text-white/70 border border-white/10">
                {modelInfo.modelName || "Model"} v{modelInfo.modelVersion}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed mt-0.5">
            Automated damage bounding box and feature extraction for examiner review
          </p>
        </div>
        <span
          className="badge"
          style={{
            background: "rgba(255, 159, 10, 0.12)",
            color: "#FF9F0A",
            border: "1px solid rgba(255, 159, 10, 0.28)",
          }}
        >
          {detections.length} {detections.length === 1 ? "detection" : "detections"}
        </span>
      </div>

      {detections.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
          No external vehicle damage detections identified on this evidence
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          <div className="grid grid-cols-4 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] bg-white/[0.02]">
            <span>Vehicle Part</span>
            <span>Damage Type</span>
            <span>Bounding Box</span>
            <span>Confidence</span>
          </div>
          {detections.map((f, i) => (
            <div
              key={f.id || i}
              className="grid grid-cols-4 items-center px-5 py-3 hover:bg-white/[0.04] transition-colors duration-200"
            >
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white tracking-tight">
                  {f.part || "External Panel"}
                </span>
                {f.severity && (
                  <span className={`text-[10px] font-medium w-fit mt-0.5 px-1 rounded ${getSeverityColor(f.severity)}`}>
                    {f.severity}
                  </span>
                )}
              </div>
              <span className="text-xs capitalize text-[var(--text-secondary)] font-medium">
                {f.damageType}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {f.bbox ? `[${f.bbox.map((n) => Math.round(n)).join(", ")}]` : "Detected"}
              </span>
              <ConfidenceBar value={f.confidence} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
