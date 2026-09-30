"use client";

import { getStatusColor, getStatusLabel, getRiskBadgeColor } from "@/lib/utils";
import type { ClaimStatus, RiskLevel } from "@/types";

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <span className={`badge ${getStatusColor(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <span className={`badge ${getRiskBadgeColor(risk)}`}>
      {risk}
    </span>
  );
}

export function AIProcessingBadge() {
  return (
    <span className="badge" style={{ background: "rgba(6,182,212,0.1)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.2)" }}>
      <span className="w-1.5 h-1.5 rounded-full mr-1 animate-pulse" style={{ background: "#06b6d4", display: "inline-block" }} />
      AI Processing
    </span>
  );
}
