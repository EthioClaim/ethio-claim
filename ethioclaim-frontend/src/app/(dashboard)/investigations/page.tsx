"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchClaims } from "@/lib/api";
import { getRiskBadgeColor, getStatusColor, getStatusLabel, formatDate, formatCurrency } from "@/lib/utils";
import type { Claim } from "@/types";

export default function InvestigationsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClaims({ risk: "HIGH" }).then((data) => {
      const highRisk = data.filter((c) => c.riskLevel === "HIGH" || c.riskLevel === "CRITICAL");
      setClaims(highRisk);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: "Space Grotesk" }}>Investigation Queue</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Claims flagged for deeper review based on AI risk scoring
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
          <span className="text-sm font-medium" style={{ color: "#f87171" }}>
            {loading ? "…" : claims.length} active
          </span>
        </div>
      </div>

      {/* Priority summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Critical",   count: 17, color: "#a855f7", bg: "rgba(168,85,247,0.08)" },
          { label: "High Risk",  count: 43, color: "#f97316", bg: "rgba(249,115,22,0.08)" },
          { label: "Similarity", count: 12, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
          { label: "Inconsistency", count: 8, color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
        ].map((s) => (
          <div key={s.label} className="card p-4" style={{ border: `1px solid ${s.bg.replace("0.08", "0.2")}`, background: s.bg }}>
            <div className="text-2xl font-bold" style={{ color: s.color, fontFamily: "Space Grotesk" }}>{s.count}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Investigation cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Show all claims as investigation items for demo */}
          {[...claims, ...claims.slice(0, 1)].map((claim, i) => (
            <div
              key={`${claim.id}-${i}`}
              className="card card-hover p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-bold" style={{ color: "#93c5fd" }}>{claim.claimNumber}</span>
                    <span className={`badge ${getRiskBadgeColor(claim.riskLevel)}`}>{claim.riskLevel}</span>
                    <span className={`badge ${getStatusColor(claim.status)}`}>{getStatusLabel(claim.status)}</span>
                  </div>
                  <div className="text-sm mb-1">
                    <span className="font-medium">{claim.claimant.name}</span>
                    <span style={{ color: "var(--text-muted)" }}> · {claim.vehicle.make} {claim.vehicle.model} ({claim.vehicle.plate})</span>
                  </div>
                  <p className="text-sm line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                    {claim.accidentDescription}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ fontFamily: "Space Grotesk" }}>
                      {formatCurrency(claim.estimatedAmount)}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>Estimated</div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/claims/${claim.id}/ai-analysis`} className="btn btn-secondary btn-sm">
                      View AI Analysis
                    </Link>
                    <Link href={`/claims/${claim.id}`} className="btn btn-primary btn-sm" id={`investigate-${claim.id}`}>
                      Open Claim →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Risk signals */}
              <div className="mt-3 pt-3 flex flex-wrap gap-2 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Signals:</span>
                {[
                  i === 0 && "Historical image similarity 91%",
                  i === 0 && "High claim amount",
                  "Narrative/evidence inconsistency",
                  i !== 1 && "Incomplete evidence",
                ].filter(Boolean).map((signal, si) => (
                  <span key={si} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                    {signal as string}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
