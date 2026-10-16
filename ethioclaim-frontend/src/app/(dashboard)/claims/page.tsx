"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fetchClaims } from "@/lib/api";
import { ClaimStatusBadge } from "@/components/claims/claim-status-badge";
import { formatDate } from "@/lib/utils";
import type { Claim, ClaimStatus } from "@/types";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All Workflow Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "POLICY_UNVERIFIED", label: "Policy Unverified" },
  { value: "PROCESSING", label: "AI Processing" },
  { value: "READY_FOR_REVIEW", label: "Ready For Review" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "EVIDENCE_REQUESTED", label: "Evidence Requested" },
  { value: "NEED_MORE_EVIDENCE", label: "Need More Evidence" },
  { value: "ASSESSED", label: "Assessed" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CLOSED", label: "Closed" },
];

export default function ClaimsListPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Query parameters according to Section 2.3
  const [q, setQ] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchClaims({
        page,
        pageSize,
        status: selectedStatus || undefined,
        q: q.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        assignedToMe: assignedToMe ? true : undefined,
      });
      setClaims(res.items || []);
      setTotal(res.total || res.items?.length || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load claims");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, selectedStatus, q, from, to, assignedToMe]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadClaims();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadClaims]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  function handleResetFilters() {
    setQ("");
    setSelectedStatus("");
    setFrom("");
    setTo("");
    setAssignedToMe(false);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] heading-display">
            Insurance Claims Management
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            {loading ? "Refreshing claim records…" : `${total} registered motor claim records`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/policies/verify"
            className="btn btn-secondary text-xs py-2 px-3.5 shadow-sm"
          >
            Verify Policy
          </Link>
          <Link
            href="/claims/new"
            className="btn btn-primary text-xs py-2 px-4 shadow-sm flex items-center gap-2"
            id="claims-new-btn"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-semibold">New Claim Intake</span>
          </Link>
        </div>
      </div>

      {/* Advanced Filter & Query Controls (Section 2.3) */}
      <div className="card apple-glass p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Query search (q) */}
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
              id="claims-search-input"
              type="text"
              placeholder="Filter by claim #, claimant, plate, or policy…"
              className="input pl-10 h-10 text-xs rounded-xl"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Status Dropdown */}
          <select
            id="claims-filter-status"
            className="select h-10 text-xs rounded-xl min-w-44"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Date range from/to */}
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              title="From date"
              className="input h-10 text-xs px-2.5 rounded-xl"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
            <span className="text-[var(--text-muted)]">to</span>
            <input
              type="date"
              title="To date"
              className="input h-10 text-xs px-2.5 rounded-xl"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Assigned to me toggle */}
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer select-none px-2">
            <input
              type="checkbox"
              checked={assignedToMe}
              onChange={(e) => {
                setAssignedToMe(e.target.checked);
                setPage(1);
              }}
              className="rounded border-white/20 bg-white/10 text-[#0A84FF] focus:ring-0"
            />
            <span>Assigned to me</span>
          </label>

          {(q || selectedStatus || from || to || assignedToMe) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#FF6961] hover:underline px-2"
            >
              Reset
            </button>
          )}

          <button
            onClick={() => loadClaims()}
            disabled={loading}
            className="btn btn-secondary h-10 px-3 text-xs flex items-center gap-1.5 ml-auto"
            title="Reload claims"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadClaims()} className="underline hover:text-white ml-3">Retry</button>
        </div>
      )}

      {/* Data Grid / Table */}
      <div className="card apple-glass overflow-hidden">
        {loading ? (
          <div className="divide-y divide-white/5 p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 animate-pulse">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-4 w-44 rounded" />
                <div className="skeleton h-4 w-28 rounded" />
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-white">No Claims Found</p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {q || selectedStatus || from || to
                ? "No claims match your filter criteria. Try clearing search or status filters."
                : "No motor insurance claims currently registered. Start an intake to begin."}
            </p>
            <Link href="/claims/new" className="btn btn-primary text-xs inline-flex mt-2">
              Start New Claim Intake
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] bg-white/[0.02] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-3.5">Claim ID</th>
                  <th className="px-5 py-3.5">Claimant</th>
                  <th className="px-5 py-3.5">Vehicle</th>
                  <th className="px-5 py-3.5">Policy Number</th>
                  <th className="px-5 py-3.5">Incident Date</th>
                  <th className="px-5 py-3.5">Workflow Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-normal">
                {claims.map((claim) => {
                  const claimantName = claim.claimant?.name || "—";
                  const vehicleLabel = claim.vehicle
                    ? `${claim.vehicle.year || ""} ${claim.vehicle.make} ${claim.vehicle.model}`.trim()
                    : "—";
                  const plate = claim.vehicle?.plate;
                  const pol = claim.policyNumber || claim.policy?.policyNumber || "—";

                  return (
                    <tr
                      key={claim.id}
                      className="hover:bg-white/[0.03] transition-colors duration-150 group"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-white">
                        <Link href={`/claims/${claim.id}`} className="hover:text-[#64D2FF]">
                          {claim.claimNumber || claim.id}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">{claimantName}</div>
                        {claim.claimant?.phone && (
                          <div className="text-[11px] text-[var(--text-muted)] font-mono">{claim.claimant.phone}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-white">{vehicleLabel}</div>
                        {plate && (
                          <div className="text-[11px] font-mono text-[var(--text-muted)]">{plate}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-[var(--text-secondary)]">
                        {pol}
                      </td>
                      <td className="px-5 py-4 text-[var(--text-muted)]">
                        {formatDate(claim.incidentDate || claim.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <ClaimStatusBadge status={claim.status as ClaimStatus} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/claims/${claim.id}`}
                          className="btn btn-secondary text-xs py-1.5 px-3 font-semibold hover:border-white/30"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)] bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <span>
              Page {page} of {totalPages} ({total} claims)
            </span>
            <select
              className="select text-[11px] h-7 px-2 rounded-lg bg-white/5 border-white/10"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn btn-secondary py-1 px-3 text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-secondary py-1 px-3 text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
