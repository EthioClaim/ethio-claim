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
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="stat-card">
              <div className="skeleton w-9 h-9 rounded-lg mb-3" />
              <div className="skeleton h-7 w-16 mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card p-6" style={{ height: 280 }}>
            <div className="skeleton h-5 w-32 mb-2" />
            <div className="skeleton h-4 w-48 mb-6" />
            <div className="skeleton h-40 w-full rounded-lg" />
          </div>
          <div className="card p-6" style={{ height: 280 }}>
            <div className="skeleton h-5 w-32 mb-2" />
            <div className="skeleton h-40 w-full rounded-full mt-6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Claims Overview
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Real-time performance metrics · Updated just now
          </p>
        </div>
        <div className="flex gap-2">
          <button id="dashboard-export" className="btn btn-secondary btn-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
          <select className="select btn-sm" id="dashboard-period" style={{ height: "32px" }}>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>This year</option>
          </select>
        </div>
      </div>

      {/* KPI Stats */}
      {stats && <StatsGrid stats={stats} />}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ClaimsChart data={overtime} />
        </div>
        <RiskDistributionChart data={riskDist} />
      </div>

      {/* Recent claims + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentClaims claims={claims} />
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-4">
          <div className="card p-5">
            <h4 className="text-sm font-semibold mb-4">Quick Actions</h4>
            <div className="space-y-2">
              {[
                { label: "Submit New Claim", href: "/claims/new", accent: "#3b82f6", icon: "M12 4v16m8-8H4" },
                { label: "View Investigations", href: "/investigations", accent: "#f97316", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
                { label: "Analytics Report", href: "/analytics", accent: "#8b5cf6", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
              ].map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 p-3 rounded-lg transition-all"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-light)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${a.accent}20` }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={a.accent}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.icon} />
                    </svg>
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{a.label}</span>
                  <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--text-muted)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* AI Health */}
          <div className="card p-5">
            <h4 className="text-sm font-semibold mb-3">AI System Health</h4>
            <div className="space-y-3">
              {[
                { name: "Damage Detection",  status: "Operational", pct: 98, color: "#10b981" },
                { name: "OCR Extraction",    status: "Operational", pct: 96, color: "#10b981" },
                { name: "Image Similarity",  status: "Degraded",    pct: 71, color: "#f59e0b" },
                { name: "Risk Model",        status: "Operational", pct: 99, color: "#10b981" },
              ].map((mod) => (
                <div key={mod.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--text-secondary)" }}>{mod.name}</span>
                    <span style={{ color: mod.color }}>{mod.status}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${mod.pct}%`, background: mod.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
