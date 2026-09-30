"use client";

import Link from "next/link";
import type { Claim } from "@/types";
import { getStatusColor, getStatusLabel, getRiskBadgeColor, formatDate } from "@/lib/utils";

export function RecentClaims({ claims }: { claims: Claim[] }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div>
          <h3 className="text-base font-semibold">Recent Claims</h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Latest activity across all examiners</p>
        </div>
        <Link href="/claims" className="btn btn-ghost btn-sm" style={{ fontSize: "0.8rem" }}>
          View All →
        </Link>
      </div>
      <div>
        {claims.slice(0, 5).map((claim, i) => (
          <Link
            key={claim.id}
            href={`/claims/${claim.id}`}
            className="flex items-center gap-4 px-6 py-4 hover:bg-opacity-50 transition-colors"
            style={{
              borderBottom: i < 4 ? "1px solid var(--border)" : "none",
              background: "transparent",
              textDecoration: "none",
              color: "inherit",
              display: "flex",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {/* Claim number */}
            <div className="flex-shrink-0 w-32">
              <div className="text-sm font-mono font-medium" style={{ color: "#93c5fd" }}>
                {claim.claimNumber}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {formatDate(claim.createdAt)}
              </div>
            </div>

            {/* Claimant & vehicle */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{claim.claimant.name}</div>
              <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                {claim.vehicle.year} {claim.vehicle.make} {claim.vehicle.model} · {claim.vehicle.plate}
              </div>
            </div>

            {/* Status & Risk */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`badge ${getStatusColor(claim.status)}`}>
                {getStatusLabel(claim.status)}
              </span>
              <span className={`badge ${getRiskBadgeColor(claim.riskLevel)}`}>
                {claim.riskLevel}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
