"use client";

import type { DamageDetection } from "@/types";
import { formatConfidence, getSeverityColor } from "@/lib/utils";

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value > 0.85 ? "#30D158" : value > 0.7 ? "#FF9F0A" : "#64D2FF";
  const bgGlow =
    value > 0.85
      ? "rgba(48, 209, 88, 0.25)"
      : value > 0.7
        ? "rgba(255, 159, 10, 0.25)"
        : "rgba(100, 210, 255, 0.25)";

  return (
    <div className="flex items-center gap-2.5 flex-1 min-w-[120px]">
      <div className="relative flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 10px ${bgGlow}`,
          }}
        />
      </div>
      <span className="text-[11px] font-mono font-bold tracking-tight" style={{ color }}>
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
    <div className="card apple-glass overflow-hidden border border-white/10 shadow-lg">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-4 bg-white/[0.015]">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.018em] leading-snug">
              Computer Vision Damage Detections
            </h3>
            {modelInfo?.modelVersion && (
              <span className="badge text-[10px] font-mono bg-white/[0.06] text-white/80 border border-white/10 px-2 py-0.5 rounded-full">
                {modelInfo.modelName || "YOLOv8-Dam"} v{modelInfo.modelVersion}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed mt-0.5">
            Automated feature localization, part bounding boxes, and severity classification
          </p>
        </div>
        <span
          className="badge text-[11px] font-semibold px-2.5 py-1 rounded-full font-mono"
          style={{
            background: detections.length > 0 ? "rgba(255, 159, 10, 0.14)" : "rgba(48, 209, 88, 0.14)",
            color: detections.length > 0 ? "#FF9F0A" : "#30D158",
            border: `1px solid ${detections.length > 0 ? "rgba(255, 159, 10, 0.3)" : "rgba(48, 209, 88, 0.3)"}`,
          }}
        >
          {detections.length} {detections.length === 1 ? "detection" : "detections"}
        </span>
      </div>

      {detections.length === 0 ? (
        <div className="px-5 py-12 text-center text-xs text-[var(--text-muted)] space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mx-auto text-xl text-[var(--text-muted)] mb-2 shadow-inner">
            🛡️
          </div>
          <p className="font-semibold text-white/95 text-sm">No Surface Damage Localized</p>
          <p className="text-[12px] text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
            The computer vision model did not localize surface dents, scratches, component tears, or panel disfigurations on this evidence file.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)] overflow-x-auto">
          <div className="grid grid-cols-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] bg-white/[0.02] min-w-[500px]">
            <span>Vehicle Part</span>
            <span>Damage Type</span>
            <span>Bounding Box [X, Y, W, H]</span>
            <span>Confidence</span>
          </div>
          {detections.map((f, i) => (
            <div
              key={f.id || i}
              className="grid grid-cols-4 items-center px-5 py-3.5 hover:bg-white/[0.04] transition-colors duration-150 min-w-[500px]"
            >
              <div className="flex flex-col pr-2">
                <span className="text-xs font-semibold text-white tracking-tight">
                  {f.part || "External Panel"}
                </span>
                {f.severity && (
                  <span className={`text-[10px] font-semibold w-fit mt-1 px-1.5 py-0.5 rounded ${getSeverityColor(f.severity)} font-mono uppercase tracking-wider`}>
                    {f.severity}
                  </span>
                )}
              </div>
              <span className="text-xs capitalize text-[var(--text-secondary)] font-medium">
                {f.damageType || f.label || "Surface Damage"}
              </span>
              <div className="font-mono text-[11px] text-[var(--text-muted)]">
                <span className="px-2 py-0.5 rounded bg-black/40 border border-white/8 text-[#64D2FF]">
                  {f.bbox
                    ? `[${f.bbox.map((n) => Math.round(n)).join(", ")}]`
                    : f.box
                      ? `[${f.box.map((n) => Math.round(n)).join(", ")}]`
                      : "Logged"}
                </span>
              </div>
              <ConfidenceBar value={f.confidence ?? 0} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
