"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchClaims } from "@/lib/api";
import { ClaimStatusBadge, RiskBadge } from "@/components/claims/claim-status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Claim, ClaimStatus, RiskLevel } from "@/types";

const STATUS_OPTIONS: ClaimStatus[] = [
  "DRAFT", "SUBMITTED", "EVIDENCE_CHECK", "NEEDS_INFORMATION",
  "AI_PROCESSING", "TRIAGED", "EXAMINER", "INVESTIGATION", "CLOSED",
];
const RISK_OPTIONS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ClaimStatus | "">("");
  const [filterRisk, setFilterRisk] = useState<RiskLevel | "">("");

  useEffect(() => {
    setLoading(true);
    fetchClaims({
      status: filterStatus || undefined,
      risk: filterRisk || undefined,
      search: search || undefined,
    }).then((data) => { setClaims(data); setLoading(false); });
  }, [search, filterStatus, filterRisk]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Claims</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {loading ? "Loading…" : `${claims.length} claims found`}
          </p>
        </div>
        <Link href="/claims/new" className="btn btn-primary" id="claims-new-btn">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Claim
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-muted)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="claims-search"
              type="text"
              placeholder="Search by claim number, name, plate…"
              className="input"
              style={{ paddingLeft: "36px" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            id="claims-filter-status"
            className="select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ClaimStatus | "")}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            id="claims-filter-risk"
            className="select"
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value as RiskLevel | "")}
          >
            <option value="">All Risk Levels</option>
            {RISK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {(filterStatus || filterRisk || search) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(""); setFilterStatus(""); setFilterRisk(""); }}
              id="claims-clear-filters"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="skeleton h-10 w-28" />
                <div className="skeleton h-10 flex-1" />
                <div className="skeleton h-10 w-20" />
                <div className="skeleton h-10 w-24" />
              </div>
            ))}
          </div>
        ) : claims.length === 0 ? (
          <div className="py-16 text-center" style={{ color: "var(--text-muted)" }}>
            <svg className="w-10 h-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-medium">No claims found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Claim Number</th>
                  <th>Claimant</th>
                  <th>Vehicle</th>
                  <th>Incident Date</th>
                  <th>Amount (ETB)</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>AI</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id} className="cursor-pointer">
                    <td>
                      <span className="font-mono text-sm" style={{ color: "#93c5fd" }}>
                        {claim.claimNumber}
                      </span>
                    </td>
                    <td>
                      <div className="font-medium text-sm">{claim.claimant.name}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{claim.claimant.phone}</div>
                    </td>
                    <td>
                      <div className="text-sm">{claim.vehicle.make} {claim.vehicle.model}</div>
                      <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{claim.vehicle.plate}</div>
                    </td>
                    <td className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {formatDate(claim.incidentDate)}
                    </td>
                    <td className="text-sm font-medium">
                      {claim.estimatedAmount.toLocaleString()}
                    </td>
                    <td><ClaimStatusBadge status={claim.status} /></td>
                    <td><RiskBadge risk={claim.riskLevel} /></td>
                    <td>
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ background: claim.aiProcessed ? "#10b981" : "var(--text-muted)" }}
                        title={claim.aiProcessed ? "AI Processed" : "Pending AI"}
                      />
                    </td>
                    <td>
                      <Link
                        href={`/claims/${claim.id}`}
                        className="btn btn-ghost btn-sm"
                        id={`claim-row-${claim.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
