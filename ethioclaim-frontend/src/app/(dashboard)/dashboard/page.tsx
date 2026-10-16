"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchDashboardSummary, fetchClaims } from "@/lib/api";
import { ClaimStatusBadge } from "@/components/claims/claim-status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { DashboardSummary, Claim } from "@/types";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentClaims, setRecentClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sumRes, claimsRes] = await Promise.allSettled([
          fetchDashboardSummary(),
          fetchClaims({ pageSize: 5 }),
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

  const total = summary?.totalClaims ?? recentClaims.length;
  const reviewQueue = summary?.reviewQueueCount ?? recentClaims.filter((c) => c.status === "READY_FOR_REVIEW" || c.status === "UNDER_REVIEW").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] heading-display">
            Claims Operations Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Motor claim adjudication metrics, examiner triage queue, and intake velocity
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
          <Link
            href="/claims/new"
            className="btn btn-primary text-xs py-2 px-4 shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Claim Intake</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Claims */}
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
          <div className="text-[11px] text-[var(--text-muted)]">Registered in local registry</div>
        </div>

        {/* Examiner Review Queue */}
        <div className="card apple-glass p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
            <span>Review Queue</span>
            <div className="w-7 h-7 rounded-lg bg-[#FF9F0A]/10 text-[#FF9F0A] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#FFD60A] font-mono">
            {loading ? "…" : reviewQueue}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">Awaiting examiner assessment</div>
        </div>

        {/* AI Processing */}
        <div className="card apple-glass p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
            <span>AI Processing</span>
            <div className="w-7 h-7 rounded-lg bg-[#64D2FF]/10 text-[#64D2FF] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#64D2FF] font-mono">
            {loading ? "…" : summary?.statusCounts?.PROCESSING ?? recentClaims.filter((c) => c.status === "PROCESSING").length}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">Damage localization active</div>
        </div>

        {/* Completed Assessments */}
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
            {loading ? "…" : (summary?.statusCounts?.ASSESSED ?? 0) + (summary?.statusCounts?.CLOSED ?? 0)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">Human assessments saved</div>
        </div>
      </div>

      {/* Recent Claims Workspace Table */}
      <div className="card apple-glass overflow-hidden space-y-0">
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Recent Adjudication Activity</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Claims recently submitted or updated in registry</p>
          </div>
          <Link href="/claims" className="btn btn-secondary text-xs py-1.5 px-3">
            View All Claims →
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-10 w-full rounded-xl" />
            ))}
          </div>
        ) : recentClaims.length === 0 ? (
          <div className="p-10 text-center text-xs text-[var(--text-muted)] space-y-2">
            <p>No recent claims found.</p>
            <Link href="/claims/new" className="btn btn-primary text-xs inline-flex">
              Create First Claim
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] bg-white/[0.02] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-3">Claim ID</th>
                  <th className="px-5 py-3">Claimant</th>
                  <th className="px-5 py-3">Vehicle</th>
                  <th className="px-5 py-3">Policy Number</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-normal">
                {recentClaims.slice(0, 5).map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-white">
                      <Link href={`/claims/${c.id}`} className="hover:text-[#64D2FF]">
                        {c.claimNumber || c.id}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-white font-medium">
                      {c.claimant?.name || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                      {c.vehicle?.make} {c.vehicle?.model} ({c.vehicle?.plate || "—"})
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-muted)]">
                      {c.policyNumber || c.policy?.policyNumber || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <ClaimStatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/claims/${c.id}`}
                        className="btn btn-secondary text-xs py-1 px-2.5 font-semibold"
                      >
                        Review
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
