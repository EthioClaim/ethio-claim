"use client";

import { getStatusColor, getStatusLabel, getRiskBadgeColor } from "@/lib/utils";
import type { ClaimStatus, RiskLevel } from "@/types";

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const isPulse = status === "PROCESSING" || status === "UNDER_REVIEW";
  return (
    <span
      className={`badge ${getStatusColor(status)} shadow-xs backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold tracking-tight transition-transform duration-200 select-none`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 ${
          isPulse ? "animate-pulse" : "opacity-85"
        }`}
      />
      <span className="leading-none">{getStatusLabel(status)}</span>
    </span>
  );
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const isHighRisk = risk === "HIGH" || risk === "CRITICAL";
  return (
    <span
      className={`badge ${getRiskBadgeColor(risk)} shadow-xs backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold tracking-tight transition-transform duration-200 select-none`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 ${
          isHighRisk ? "animate-ping" : "opacity-85"
        }`}
      />
      <span className="leading-none">{risk} Risk</span>
    </span>
  );
}

export function AIProcessingBadge() {
  return (
    <span
      className="badge shadow-xs backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold tracking-tight select-none"
      style={{
        background: "rgba(100, 210, 255, 0.12)",
        color: "#64D2FF",
        border: "1px solid rgba(100, 210, 255, 0.3)",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1 animate-pulse bg-[#64D2FF] inline-block flex-shrink-0" />
      <span className="leading-none">AI Processing</span>
    </span>
  );
}
