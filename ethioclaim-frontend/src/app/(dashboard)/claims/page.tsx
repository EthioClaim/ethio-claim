"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchClaims, fetchCurrentUser } from "@/lib/api";
import { ClaimStatusBadge } from "@/components/claims/claim-status-badge";
import { formatDate } from "@/lib/utils";
import type { Claim, ClaimStatus, CurrentUser } from "@/types";

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

const PRESET_STATUS_CHIPS = [
  { value: "", label: "All" },
  { value: "READY_FOR_REVIEW", label: "Ready for Review" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "ASSESSED", label: "Assessed" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

function ClaimsListContent() {
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [showUploadAlert, setShowUploadAlert] = useState(
    searchParams.get("uploaded") === "true"
  );

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Query parameters
  const [q, setQ] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("ethioclaim_user");
        if (raw) {
          const parsed = JSON.parse(raw);
          setCurrentUser(parsed);
          if (parsed.role === "EXAMINER") {
            setAssignedToMe(true);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchCurrentUser()
      .then((u) => {
        setCurrentUser(u);
        if (u.role === "EXAMINER") {
          setAssignedToMe(true);
        }
      })
      .catch(() => { });
  }, []);

  const isExaminer = currentUser?.role === "EXAMINER";

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
        assignedToMe: isExaminer || assignedToMe ? true : undefined,
      });
      setClaims(res.items || []);
      setTotal(res.total || res.items?.length || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load claims");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, selectedStatus, q, from, to, assignedToMe, isExaminer]);

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
    setAssignedToMe(isExaminer);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Upload Success Alert */}
      {showUploadAlert && (
        <div className="p-4 rounded-2xl bg-[#0A84FF]/12 border border-[#0A84FF]/30 text-xs text-[#64D2FF] flex items-center justify-between shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0A84FF] animate-ping flex-shrink-0" />
            <span className="font-semibold text-white">Evidence submitted successfully.</span>
            <span className="text-white/80">Computer vision model is processing vehicle damage findings in the background.</span>
          </div>
          <button
            onClick={() => setShowUploadAlert(false)}
            className="text-white/60 hover:text-white text-xs underline font-medium ml-4 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.032em] heading-display">
            {isExaminer ? "Examiner Claim Queue" : "Insurance Claims Management"}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            {loading
              ? "Refreshing claim records…"
              : isExaminer
                ? `${total} claims allocated for examiner assessment & loss estimation`
                : `${total} registered motor claim records in active workflow`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/policies/verify"
            className="btn btn-secondary text-xs py-2 px-3.5 shadow-sm"
          >
            Verify Policy
          </Link>
          {!isExaminer && (
            <Link
              href="/claims/new"
              className="btn btn-primary text-xs py-2 px-4 shadow-sm flex items-center gap-2"
              id="claims-new-btn"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-semibold">New Claim Intake</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Advanced Apple Filter & Spotlight Search ── */}
      <div className="card apple-glass p-5 sm:p-6 space-y-4">
        {/* Preset Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mr-1">
            Status:
          </span>
          {PRESET_STATUS_CHIPS.map((chip) => {
            const isSelected = selectedStatus === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => {
                  setSelectedStatus(chip.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 select-none whitespace-nowrap ${isSelected
                    ? "bg-[#0A84FF] text-white shadow-xs font-semibold"
                    : "bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08] hover:text-white border border-white/6"
                  }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Input Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Query search (q) */}
          <div className="relative flex-1 min-w-64 group">
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
              placeholder="Search by claim #, claimant, license plate, or policy…"
              className="input pl-10 h-11 text-xs rounded-xl"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Full Status Dropdown for granular statuses */}
          <select
            id="claims-filter-status"
            className="select h-11 text-xs rounded-xl min-w-44"
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
          <div className="flex items-center gap-2 text-xs bg-white/[0.03] border border-white/8 px-3 py-1 rounded-xl h-11">
            <span className="text-[var(--text-muted)] font-mono text-[11px]">From</span>
            <input
              type="date"
              title="From date"
              className="bg-transparent text-white text-xs outline-none cursor-pointer"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
            <span className="text-[var(--text-muted)] font-mono text-[11px]">To</span>
            <input
              type="date"
              title="To date"
              className="bg-transparent text-white text-xs outline-none cursor-pointer"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Assigned to me toggle */}
          <label className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] cursor-pointer select-none px-2 h-11">
            <div
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${assignedToMe ? "bg-[#0A84FF]" : "bg-white/15"
                }`}
              onClick={() => {
                setAssignedToMe(!assignedToMe);
                setPage(1);
              }}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${assignedToMe ? "translate-x-4" : "translate-x-0"
                  }`}
              />
            </div>
            <span className="font-medium text-white">Assigned to me</span>
          </label>

          {(q || selectedStatus || from || to || (assignedToMe && !isExaminer)) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#FF6961] hover:underline px-2 font-medium"
            >
              Reset Filters
            </button>
          )}

          <button
            onClick={() => loadClaims()}
            disabled={loading}
            className="btn btn-secondary h-11 px-3.5 text-xs flex items-center gap-1.5 ml-auto"
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
        <div className="p-4 rounded-2xl bg-[#FF453A]/12 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadClaims()} className="underline hover:text-white ml-3 font-semibold">Retry</button>
        </div>
      )}

      {/* Data Grid / Table */}
      <div className="card apple-glass overflow-hidden shadow-md">
        {loading ? (
          <div className="divide-y divide-white/5 p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 animate-pulse">
                <div className="skeleton h-5 w-32 rounded-lg" />
                <div className="skeleton h-5 w-44 rounded-lg" />
                <div className="skeleton h-5 w-28 rounded-lg" />
                <div className="skeleton h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-base font-bold text-white">No Matching Claims Found</p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
              {q || selectedStatus || from || to
                ? "No claims match your filter criteria. Try resetting search or status filters."
                : isExaminer
                  ? "No motor insurance claims currently allocated to your adjudication queue."
                  : "No motor insurance claims registered. Start a new intake to begin."}
            </p>
            {!isExaminer && (
              <Link href="/claims/new" className="btn btn-primary text-xs inline-flex mt-2">
                Start New Claim Intake
              </Link>
            )}
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
                  const claimantName =
                    claim.claimant?.fullName ||
                    claim.claimant?.name ||
                    claim.claimantFullName ||
                    claim.claimantName ||
                    "—";
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
                      <td className="px-5 py-4 font-mono font-bold text-[#64D2FF]">
                        <Link href={`/claims/${claim.id}`} className="hover:underline flex items-center gap-1.5">
                          <span>{claim.claimNumber || claim.id}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">{claimantName}</div>
                        {claim.claimant?.phone && (
                          <div className="text-[11px] text-[var(--text-muted)] font-mono">{claim.claimant.phone}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-white font-medium">{vehicleLabel}</div>
                        {plate && (
                          <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-white/90">
                              {plate}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-[var(--text-secondary)]">
                        {pol}
                      </td>
                      <td className="px-5 py-4 text-[var(--text-muted)] font-mono text-[11px]">
                        {formatDate(claim.incidentDate || claim.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <ClaimStatusBadge status={claim.status as ClaimStatus} />
                          {/* AI Screening & Review Flags */}
                          {claim.status === "PROCESSING" && (
                            <span className="badge text-[9px] bg-[#64D2FF]/15 text-[#64D2FF] border border-[#64D2FF]/30 animate-pulse">
                              AI Processing
                            </span>
                          )}
                          {(claim.status === "READY_FOR_REVIEW" ||
                            claim.aiRiskAssessment?.label === "POTENTIAL_FRAUD" ||
                            (claim.evidence as any[])?.some(
                              (e) => e.matches?.length > 0 || e.analysis?.riskAssessment?.label === "POTENTIAL_FRAUD"
                            )) && (
                              <span className="badge text-[9px] bg-[#FF453A]/20 text-[#FF6961] border border-[#FF453A]/40">
                                ⚠️ Fraud Review
                              </span>
                            )}
                          {((claim as any).noDamageDetected ||
                            (claim.evidence as any[])?.some(
                              (e) =>
                                (e.analysis as any)?.detections?.length === 0 &&
                                (e.analysis as any)?.status === "COMPLETED"
                            )) && (
                              <span className="badge text-[9px] bg-[#FF9F0A]/20 text-[#FFD60A] border border-[#FF9F0A]/40">
                                🔍 No Damage Detected
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/claims/${claim.id}`}
                          className="btn btn-secondary text-xs py-1.5 px-3 font-semibold group-hover:border-[#0A84FF]/50 transition-colors"
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
              Page {page} of {totalPages} ({total} total claims)
            </span>
            <select
              className="select text-[11px] h-8 px-2.5 rounded-lg bg-white/5 border-white/10"
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

export default function ClaimsListPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="skeleton h-8 w-64 rounded-lg" />
          <div className="skeleton h-28 w-full rounded-2xl" />
          <div className="skeleton h-80 w-full rounded-2xl" />
        </div>
      }
    >
      <ClaimsListContent />
    </Suspense>
  );
}
