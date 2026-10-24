"use client";

import { getStatusColor, getStatusLabel, getRiskBadgeColor } from "@/lib/utils";
import type { ClaimStatus, RiskLevel } from "@/types";

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <span className={`badge ${getStatusColor(status)} shadow-xs backdrop-blur-md`}>
      <span className="w-1.5 h-1.5 rounded-full opacity-80 bg-current inline-block flex-shrink-0" />
      <span className="leading-none">{getStatusLabel(status)}</span>
    </span>
  );
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <span className={`badge ${getRiskBadgeColor(risk)} shadow-xs backdrop-blur-md`}>
      <span className="w-1.5 h-1.5 rounded-full opacity-80 bg-current inline-block flex-shrink-0" />
      <span className="leading-none">{risk}</span>
    </span>
  );
}

export function AIProcessingBadge() {
  return (
    <span 
      className="badge shadow-xs backdrop-blur-md" 
      style={{ 
        background: "rgba(100, 210, 255, 0.12)", 
        color: "#64D2FF", 
        border: "1px solid rgba(100, 210, 255, 0.3)" 
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1 animate-pulse bg-[#64D2FF] inline-block flex-shrink-0" />
      <span className="leading-none">AI Processing</span>
    </span>
  );
}
