"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchDashboardSummary, fetchClaims } from "@/lib/api";
import { ClaimStatusBadge } from "@/components/claims/claim-status-badge";
import { formatDate } from "@/lib/utils";
import type { DashboardSummary, Claim, CurrentUser } from "@/types";

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [recentClaims, setRecentClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ethioclaim_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }

    async function load() {
      setLoading(true);
      try {
        const [sumRes, claimsRes] = await Promise.allSettled([
          fetchDashboardSummary(),
          fetchClaims({ pageSize: 6 }),
        ]);

        if (sumRes.status === "fulfilled") {
          setSummary(sumRes.value);
          if (sumRes.value.recentClaims) {
            setRecentClaims(sumRes.value.recentClaims);
          }
        }

        if (claimsRes.status === "fulfilled" && (!sumRes || sumRes.status === "rejected" || !summary?.recentClaims)) {
          setRecentClaims(claimsRes.value.items || []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const role = user?.role || summary?.role || "INTAKE_USER";
  const total = summary?.totalClaims ?? recentClaims.length;

  return (
    <div className="space-y-6">
      {/* Dynamic Role-Based Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#0A84FF] uppercase tracking-wider">
              {role === "ADMIN" ? "System Administration" : role === "EXAMINER" ? "Claims Examiner Workspace" : "Motor Claim Intake Portal"}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[var(--text-muted)] font-mono">
              Role: {role}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] heading-display mt-1">
            {role === "ADMIN" ? "Operational Metrics & Control" : role === "EXAMINER" ? "Adjudication & Triage Queue" : "Claim Intake & Tracking"}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            {role === "ADMIN"
              ? "Platform health, examiner assignment queues, policy telemetry, and system audit."
              : role === "EXAMINER"
              ? "Review damage evidence, assess estimated loss in ETB, and record adjudication recommendations."
              : "Register motor claims, verify insurance policies, and monitor real-time claim status."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/policies/verify"
            className="btn btn-secondary text-xs py-2 px-4 shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-[#64D2FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Verify Policy</span>
          </Link>

          {(role === "INTAKE_USER" || role === "ADMIN") && (
            <Link
              href="/claims/new"
              className="btn btn-primary text-xs py-2 px-4 shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Claim Intake</span>
            </Link>
          )}
        </div>
      </div>

      {/* Role-Specific Metric Cards Strip */}
      {role === "ADMIN" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card apple-glass p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <span>Total Claims</span>
              <div className="w-7 h-7 rounded-lg bg-[#0A84FF]/10 text-[#0A84FF] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {loading ? "…" : total}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">Across all insurers</div>
          </div>

          <div className="card apple-glass p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <span>Unassigned Queue</span>
              <div className="w-7 h-7 rounded-lg bg-[#FF9F0A]/10 text-[#FF9F0A] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#FF9F0A] font-mono">
              {loading ? "…" : summary?.adminMetrics?.unassignedClaims ?? summary?.reviewQueueCount ?? 0}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">Needs examiner assignment</div>
          </div>

          <div className="card apple-glass p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <span>Active Policies</span>
              <div className="w-7 h-7 rounded-lg bg-[#30D158]/10 text-[#30D158] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#30D158] font-mono">
              {loading ? "…" : summary?.adminMetrics?.activePolicies ?? 0}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {summary?.adminMetrics?.expiredPolicies ?? 0} expired records
            </div>
          </div>

          <div className="card apple-glass p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <span>Analysis Failures</span>
              <div className="w-7 h-7 rounded-lg bg-[#FF453A]/10 text-[#FF453A] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#FF453A] font-mono">
              {loading ? "…" : summary?.adminMetrics?.failedAnalyses ?? 0}
            </div>
            <Link href="/admin/operations" className="text-[11px] text-[#0A84FF] hover:underline flex items-center gap-1">
              <span>Manage in Operations</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}

      {role === "INTAKE_USER" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card apple-glass p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <span>My Claims</span>
              <div className="w-7 h-7 rounded-lg bg-[#0A84FF]/10 text-[#0A84FF] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {loading ? "…" : total}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">Registered by you</div>
          </div>

          <div className="card apple-glass p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <span>Submitted</span>
              <div className="w-7 h-7 rounded-lg bg-[#30D158]/10 text-[#30D158] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#30D158] font-mono">
              {loading ? "…" : summary?.intakeMetrics?.submittedCount ?? summary?.countsByStatus?.SUBMITTED ?? 0}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">In review queue</div>
          </div>

          <div className="card apple-glass p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <span>Action Needed</span>
              <div className="w-7 h-7 rounded-lg bg-[#FF9F0A]/10 text-[#FF9F0A] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#FF9F0A] font-mono">
              {loading ? "…" : summary?.intakeMetrics?.needsMoreInfoCount ?? summary?.countsByStatus?.NEED_MORE_EVIDENCE ?? 0}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">More evidence requested</div>
          </div>

          <div className="card apple-glass p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <span>Drafts</span>
              <div className="w-7 h-7 rounded-lg bg-[#8E8E93]/10 text-[#8E8E93] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white/80 font-mono">
              {loading ? "…" : summary?.intakeMetrics?.draftsCount ?? summary?.countsByStatus?.DRAFT ?? 0}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">Unsubmitted drafts</div>
          </div>
        </div>
      )}

      {role === "EXAMINER" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card apple-glass p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <span>Assigned Queue</span>
              <div className="w-7 h-7 rounded-lg bg-[#0A84FF]/10 text-[#0A84FF] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0A84FF] font-mono">
              {loading ? "…" : summary?.examinerMetrics?.assignedQueueCount ?? summary?.countsByStatus?.UNDER_REVIEW ?? 0}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">Under active adjudication</div>
          </div>

          <div className="card apple-glass p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <span>Awaiting Review</span>
              <div className="w-7 h-7 rounded-lg bg-[#FF9F0A]/10 text-[#FF9F0A] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#FF9F0A] font-mono">
              {loading ? "…" : summary?.examinerMetrics?.awaitingReviewCount ?? summary?.reviewQueueCount ?? 0}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">Available in triage pool</div>
          </div>

          <div className="card apple-glass p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <span>Info Requested</span>
              <div className="w-7 h-7 rounded-lg bg-[#BF5AF2]/10 text-[#BF5AF2] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#BF5AF2] font-mono">
              {loading ? "…" : summary?.examinerMetrics?.infoRequestedCount ?? summary?.countsByStatus?.NEED_MORE_EVIDENCE ?? 0}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">Pending intake response</div>
          </div>

          <div className="card apple-glass p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              <span>Assessed</span>
              <div className="w-7 h-7 rounded-lg bg-[#30D158]/10 text-[#30D158] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#30D158] font-mono">
              {loading ? "…" : summary?.examinerMetrics?.completedAssessmentsCount ?? 0}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">Completed assessments</div>
          </div>
        </div>
      )}

      {/* Admin Quick Action Cards */}
      {role === "ADMIN" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/admin/users"
            className="card apple-glass p-4 border border-white/10 hover:border-[#BF5AF2]/50 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#BF5AF2]/15 text-[#BF5AF2] flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Staff & Roles</div>
              <div className="text-[10px] text-[var(--text-muted)]">Create & manage accounts</div>
            </div>
          </Link>

          <Link
            href="/admin/policies"
            className="card apple-glass p-4 border border-white/10 hover:border-[#0A84FF]/50 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0A84FF]/15 text-[#0A84FF] flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Policy Registry</div>
              <div className="text-[10px] text-[var(--text-muted)]">Register demo policies</div>
            </div>
          </Link>

          <Link
            href="/admin/audit"
            className="card apple-glass p-4 border border-white/10 hover:border-[#30D158]/50 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#30D158]/15 text-[#30D158] flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Audit Trail</div>
              <div className="text-[10px] text-[var(--text-muted)]">Inspect immutable logs</div>
            </div>
          </Link>

          <Link
            href="/admin/operations"
            className="card apple-glass p-4 border border-white/10 hover:border-[#FF9F0A]/50 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#FF9F0A]/15 text-[#FF9F0A] flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Analysis Pipeline</div>
              <div className="text-[10px] text-[var(--text-muted)]">AI queue & retries</div>
            </div>
          </Link>
        </div>
      )}

      {/* Recent Claims Section */}
      <div className="card apple-glass p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {role === "EXAMINER" ? "Prioritized Adjudication Queue" : "Recent Insurance Claims"}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {role === "EXAMINER"
                ? "Claims awaiting human damage severity and estimated loss assessment"
                : "Latest motor claims recorded in the platform"}
            </p>
          </div>
          <Link
            href="/claims"
            className="text-xs font-semibold text-[#0A84FF] hover:underline flex items-center gap-1"
          >
            <span>View All Claims</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Claims Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                <th className="py-2.5 px-3">Claim Reference</th>
                <th className="py-2.5 px-3">Claimant</th>
                <th className="py-2.5 px-3">Vehicle Plate</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[var(--text-muted)]">
                    Loading claims...
                  </td>
                </tr>
              ) : recentClaims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[var(--text-muted)]">
                    No claims found.
                  </td>
                </tr>
              ) : (
                recentClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-[#64D2FF]">
                      <Link href={`/claims/${claim.id}`} className="hover:underline">
                        {claim.claimNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-white font-medium">
                      {(claim.claimant as any)?.fullName || claim.claimant?.name || "N/A"}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                      {(claim.vehicle as any)?.plateNumber || claim.vehicle?.plate || "—"}
                    </td>
                    <td className="py-3 px-3">
                      <ClaimStatusBadge status={claim.status} />
                    </td>
                    <td className="py-3 px-3 text-[11px] text-[var(--text-muted)] font-mono">
                      {formatDate(claim.createdAt)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/claims/${claim.id}`}
                        className="btn btn-secondary text-[11px] py-1 px-2.5 inline-block"
                      >
                        {role === "EXAMINER" ? "Assess Claim" : "View"}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
