"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchClaims } from "@/lib/api";
import { ClaimStatusBadge, RiskBadge } from "@/components/claims/claim-status-badge";
import { formatDate } from "@/lib/utils";
import type { Claim, ClaimStatus, RiskLevel } from "@/types";

const STATUS_OPTIONS: ClaimStatus[] = [
  "DRAFT", "SUBMITTED", "EVIDENCE_CHECK", "NEEDS_INFORMATION",
  "AI_PROCESSING", "TRIAGED", "EXAMINER", "INVESTIGATION", "CLOSED",
];
const RISK_OPTIONS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function ClaimsPage() {
  const router = useRouter();
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
    <div className="flex flex-col gap-6">
      {/* ── Page Header (Rule 15: Optical Typography & Whitespace) ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] heading-display">
            Insurance Claims
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1 font-normal leading-relaxed">
            {loading ? "Refreshing claim records…" : `${claims.length} registered motor claims cataloged`}
          </p>
        </div>
        <Link 
          href="/claims/new" 
          className="btn btn-primary shadow-sm" 
          id="claims-new-btn"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-semibold">New Claim Intake</span>
        </Link>
      </div>

      {/* ── Filters Bar (Apple Spotlight & Glass Controls) ── */}
      <div className="card apple-glass p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="relative flex-1 min-w-56 group">
            <svg 
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[#0A84FF] transition-colors" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="claims-search"
              type="text"
              placeholder="Filter by claim number, claimant name, plate or VIN…"
              className="input pl-10 h-10 text-xs rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            id="claims-filter-status"
            className="select h-10 text-xs rounded-xl"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ClaimStatus | "")}
          >
            <option value="">All Workflow Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>

          <select
            id="claims-filter-risk"
            className="select h-10 text-xs rounded-xl"
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value as RiskLevel | "")}
          >
            <option value="">All Risk Tiers</option>
            {RISK_OPTIONS.map((r) => <option key={r} value={r}>{r} Risk</option>)}
          </select>

          {(filterStatus || filterRisk || search) && (
            <button
              className="btn btn-ghost btn-sm text-xs font-semibold text-[var(--text-muted)] hover:text-white"
              onClick={() => { setSearch(""); setFilterStatus(""); setFilterRisk(""); }}
              id="claims-clear-filters"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table (Apple Inset Grouped Table with Hover & Press States) ── */}
      <div className="card apple-glass overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="skeleton h-9 w-32 rounded-lg" />
                <div className="skeleton h-9 flex-1 rounded-lg" />
                <div className="skeleton h-9 w-24 rounded-lg" />
                <div className="skeleton h-9 w-28 rounded-lg" />
              </div>
            ))}
          </div>
        ) : claims.length === 0 ? (
          <div className="py-20 text-center text-[var(--text-muted)] space-y-2">
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-white/[0.04] border border-white/10 mb-3">
              <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-bold text-white text-base">No Matching Claims Located</p>
            <p className="text-xs">Adjust your search keyword or clear active filter constraints</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Claimant</th>
                  <th>Vehicle Details</th>
                  <th>Incident Date</th>
                  <th>Estimated Loss</th>
                  <th>Status</th>
                  <th>Risk Tier</th>
                  <th className="text-center">AI</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {claims.map((claim) => (
                  <tr 
                    key={claim.id} 
                    onClick={() => router.push(`/claims/${claim.id}`)}
                    className="cursor-pointer group hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors"
                  >
                    <td>
                      <span className="font-mono text-xs font-bold text-[#64D2FF] group-hover:text-white transition-colors">
                        {claim.claimNumber}
                      </span>
                    </td>
                    <td>
                      <div className="font-semibold text-xs text-white">{claim.claimant.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)] font-mono">{claim.claimant.phone}</div>
                    </td>
                    <td>
                      <div className="text-xs font-medium text-[var(--text-primary)]">{claim.vehicle.year} {claim.vehicle.make} {claim.vehicle.model}</div>
                      <div className="text-[11px] font-mono text-[var(--text-muted)]">{claim.vehicle.plate}</div>
                    </td>
                    <td className="text-xs text-[var(--text-secondary)]">
                      {formatDate(claim.incidentDate)}
                    </td>
                    <td className="text-xs font-mono font-bold text-white">
                      {claim.estimatedAmount.toLocaleString()} <span className="text-[10px] text-[var(--text-muted)] font-sans">ETB</span>
                    </td>
                    <td>
                      <ClaimStatusBadge status={claim.status} />
                    </td>
                    <td>
                      <RiskBadge risk={claim.riskLevel} />
                    </td>
                    <td className="text-center">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                        style={{ background: claim.aiProcessed ? "#30D158" : "rgba(255, 255, 255, 0.2)" }}
                        title={claim.aiProcessed ? "Computer Vision & Risk Complete" : "Pending AI Analysis"}
                      />
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/claims/${claim.id}`}
                        className="btn btn-ghost btn-sm text-xs font-semibold text-[#0A84FF] group-hover:text-[#64D2FF]"
                        id={`claim-row-${claim.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Inspect →
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
