"use client";

import { useEffect, useState } from "react";
import { StatsGrid } from "@/components/dashboard/stats-card";
import { ClaimsChart, RiskDistributionChart } from "@/components/dashboard/claims-chart";
import { RecentClaims } from "@/components/dashboard/recent-claims";
import { fetchDashboardStats, fetchClaimsOverTime, fetchRiskDistribution, fetchClaims } from "@/lib/api";
import type { DashboardStats, ClaimsOverTime, RiskDistribution, Claim } from "@/types";

export default function DashboardPage() {
  const [stats, setStats]         = useState<DashboardStats | null>(null);
  const [overtime, setOvertime]   = useState<ClaimsOverTime[]>([]);
  const [riskDist, setRiskDist]   = useState<RiskDistribution[]>([]);
  const [claims, setClaims]       = useState<Claim[]>([]);
  const [loading, setLoading]     = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    Promise.all([
      fetchDashboardStats(),
      fetchClaimsOverTime(),
      fetchRiskDistribution(),
      fetchClaims(),
    ]).then(([s, ot, rd, cl]) => {
      setStats(s);
      setOvertime(ot);
      setRiskDist(rd);
      setClaims(cl);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Skeleton Header */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="skeleton h-8 w-48 rounded-lg" />
            <div className="skeleton h-4 w-72 rounded-md" />
          </div>
          <div className="skeleton h-9 w-40 rounded-xl" />
        </div>

        {/* Skeleton Primary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-6 space-y-3">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="skeleton h-8 w-20 rounded-md" />
              <div className="skeleton h-4 w-32 rounded-md" />
            </div>
          ))}
        </div>

        {/* Skeleton Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 card p-6" style={{ height: 320 }}>
            <div className="skeleton h-5 w-40 mb-2" />
            <div className="skeleton h-4 w-60 mb-6" />
            <div className="skeleton h-48 w-full rounded-xl" />
          </div>
          <div className="card p-6" style={{ height: 320 }}>
            <div className="skeleton h-5 w-36 mb-2" />
            <div className="skeleton h-44 w-44 rounded-full mx-auto mt-6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Dashboard Executive Header (Optical Hierarchy Rule 15 & Whitespace Rule 16) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] heading-display">
            Claims Intelligence
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1 font-normal leading-relaxed">
            Real-time multi-insurer fraud triage and automated computer vision analysis
          </p>
        </div>

        {/* Floating Controls with Tactile Active Response */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Segmented Time Control (Apple Inset Style) */}
          <div className="segmented-control">
            {[
              { id: "7d", label: "7D" },
              { id: "30d", label: "30D" },
              { id: "90d", label: "90D" },
              { id: "1y", label: "YTD" },
            ].map((period) => (
              <button
                key={period.id}
                onClick={() => setTimeRange(period.id)}
                className={`segmented-item ${timeRange === period.id ? "active" : ""}`}
              >
                {period.label}
              </button>
            ))}
          </div>

          <button 
            id="dashboard-export" 
            className="btn btn-secondary btn-sm"
          >
            <svg className="w-3.5 h-3.5 text-[#0A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ── Section 1: Hierarchical KPI Metrics ── */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Core Performance
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            Auto-refresh active
          </span>
        </div>
        {stats && <StatsGrid stats={stats} />}
      </section>

      {/* ── Section 2: Visual Intelligence Analytics ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        <div className="lg:col-span-2">
          <ClaimsChart data={overtime} />
        </div>
        <div>
          <RiskDistributionChart data={riskDist} />
        </div>
      </section>

      {/* ── Section 3: Recent Activity & AI Health ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        <div className="lg:col-span-2">
          <RecentClaims claims={claims} />
        </div>

        {/* Quick Actions & AI Infrastructure Health Panel */}
        <div className="flex flex-col gap-5">
          {/* Quick Actions (Apple Inset Glass Cards) */}
          <div className="card apple-glass p-5 md:p-6">
            <h4 className="text-[15px] font-bold text-white tracking-[-0.015em] mb-4 leading-snug">
              Rapid Workflow Actions
            </h4>
            <div className="flex flex-col gap-3">
              {[
                { label: "Submit New Motor Claim", href: "/claims/new", accent: "#0A84FF", icon: "M12 4v16m8-8H4" },
                { label: "Review Flagged Investigations", href: "/investigations", accent: "#FF9F0A", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
                { label: "Executive Analytics Report", href: "/analytics", accent: "#BF5AF2", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
              ].map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.04] border border-[var(--border)] hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 active:scale-[0.98] group"
                  style={{ textDecoration: "none" }}
                >
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                    style={{ background: `${a.accent}22`, border: `1px solid ${a.accent}44` }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={a.accent}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.icon} />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-white transition-colors">
                    {a.label}
                  </span>
                  <svg 
                    className="w-3.5 h-3.5 ml-auto text-[var(--text-muted)] group-hover:text-white group-hover:translate-x-0.5 transition-all" 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* AI Subsystem Diagnostics */}
          <div className="card apple-glass p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[15px] font-bold text-white tracking-[-0.015em] leading-snug">
                AI Model Pipeline
              </h4>
              <span className="text-[11px] font-semibold text-[#30D158] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] inline-block animate-pulse" />
                Operational
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { name: "YOLO Damage Localization", status: "98% Acc", pct: 98, color: "#30D158" },
                { name: "Amharic & English OCR", status: "96% Acc", pct: 96, color: "#30D158" },
                { name: "Historical Image Similarity", status: "71% Acc", pct: 71, color: "#FF9F0A" },
                { name: "Fraud Risk Ensemble", status: "99% Acc", pct: 99, color: "#30D158" },
              ].map((mod) => (
                <div key={mod.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)] font-medium">{mod.name}</span>
                    <span className="font-semibold text-xs font-mono" style={{ color: mod.color }}>{mod.status}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${mod.pct}%`, background: mod.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
