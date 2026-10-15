"use client";

import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/types";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; positive: boolean };
  accent?: "blue" | "amber" | "emerald" | "purple" | "red" | "cyan";
  icon?: React.ReactNode;
  priority?: "primary" | "secondary";
}

const ACCENT_STYLES: Record<string, { bg: string; icon: string; border: string; glow: string }> = {
  blue:    { bg: "rgba(10, 132, 255, 0.12)",  icon: "#0A84FF", border: "rgba(10, 132, 255, 0.25)", glow: "rgba(10, 132, 255, 0.18)" },
  amber:   { bg: "rgba(255, 159, 10, 0.12)",  icon: "#FF9F0A", border: "rgba(255, 159, 10, 0.25)", glow: "rgba(255, 159, 10, 0.18)" },
  emerald: { bg: "rgba(48, 209, 88, 0.12)",   icon: "#30D158", border: "rgba(48, 209, 88, 0.25)",  glow: "rgba(48, 209, 88, 0.18)" },
  purple:  { bg: "rgba(191, 90, 242, 0.12)",  icon: "#BF5AF2", border: "rgba(191, 90, 242, 0.25)", glow: "rgba(191, 90, 242, 0.18)" },
  red:     { bg: "rgba(255, 69, 58, 0.12)",   icon: "#FF453A", border: "rgba(255, 69, 58, 0.25)",  glow: "rgba(255, 69, 58, 0.18)"  },
  cyan:    { bg: "rgba(100, 210, 255, 0.12)",  icon: "#64D2FF", border: "rgba(100, 210, 255, 0.25)", glow: "rgba(100, 210, 255, 0.18)" },
};

export function StatsCard({ title, value, subtitle, trend, accent = "blue", icon, priority = "primary" }: StatsCardProps) {
  const style = ACCENT_STYLES[accent];

  return (
    <div
      className={cn(
        "stat-card relative flex flex-col justify-between group cursor-default",
        priority === "primary" ? "p-5 md:p-6" : "p-4 md:p-5"
      )}
      style={{
        boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 4px 20px ${style.glow}`,
      }}
    >
      {/* Top Header: Icon Capsule & Trend Pill */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
          style={{ 
            background: style.bg, 
            border: `1px solid ${style.border}`,
            boxShadow: `0 2px 8px ${style.glow}` 
          }}
        >
          <span style={{ color: style.icon }}>{icon}</span>
        </div>

        {trend && (
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 backdrop-blur-md"
            style={{
              background: trend.positive ? "rgba(48, 209, 88, 0.14)" : "rgba(255, 69, 58, 0.14)",
              color: trend.positive ? "#30D158" : "#FF453A",
              border: `1px solid ${trend.positive ? "rgba(48, 209, 88, 0.3)" : "rgba(255, 69, 58, 0.3)"}`,
            }}
          >
            <span>{trend.positive ? "↑" : "↓"}</span>
            <span>{Math.abs(trend.value)}%</span>
          </span>
        )}
      </div>

      {/* Main Metric with Optical Display Hierarchy (Rule 15 & Requirement 3: Internal Card Spacing) */}
      <div className="flex flex-col gap-1.5 mt-auto">
        <div 
          className={cn(
            "font-extrabold text-white tracking-[-0.035em] font-mono md:font-sans",
            priority === "primary" ? "text-3xl md:text-[34px] leading-tight" : "text-2xl md:text-[28px] leading-tight"
          )}
        >
          {value}
        </div>
        <div className="text-sm font-semibold tracking-[-0.01em] text-[var(--text-secondary)] leading-snug">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-[var(--text-muted)] font-normal leading-relaxed pt-0.5">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Segmented Hierarchical Stats Grid (Rule 16: Logical Grouping & Whitespace) ──
export function StatsGrid({ stats }: { stats: DashboardStats }) {
  const primaryKpis = [
    {
      title: "Total Claims",
      value: stats.totalClaims.toLocaleString(),
      accent: "blue" as const,
      trend: { value: 12, positive: true },
      subtitle: "Lifetime volume registered",
      priority: "primary" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: "Open Claims",
      value: stats.openClaims.toLocaleString(),
      accent: "amber" as const,
      trend: { value: 8, positive: false },
      subtitle: "Awaiting triage / resolution",
      priority: "primary" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "High Risk Alerts",
      value: stats.highRiskClaims,
      accent: "red" as const,
      trend: { value: 3, positive: false },
      subtitle: "Flagged for SIU investigation",
      priority: "primary" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      title: "Avg Resolution",
      value: `${stats.avgProcessingDays}d`,
      accent: "cyan" as const,
      trend: { value: 15, positive: true },
      subtitle: "Days from intake to closing",
      priority: "primary" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  const operationalMetrics = [
    {
      title: "AI Processed Today",
      value: stats.aiProcessedToday,
      accent: "emerald" as const,
      subtitle: "Computer vision & fraud pipeline",
      priority: "secondary" as const,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      title: "This Month",
      value: stats.claimsThisMonth,
      accent: "purple" as const,
      trend: { value: 9, positive: true },
      subtitle: "New submissions intake",
      priority: "secondary" as const,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "Pending Evidence",
      value: stats.pendingEvidence,
      accent: "amber" as const,
      subtitle: "Missing vehicle inspection photos",
      priority: "secondary" as const,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "Resolved This Month",
      value: stats.closedThisMonth,
      accent: "emerald" as const,
      trend: { value: 22, positive: true },
      subtitle: "Payouts approved & closed",
      priority: "secondary" as const,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Primary Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {primaryKpis.map((item) => (
          <StatsCard key={item.title} {...item} />
        ))}
      </div>

      {/* Operational Throughput Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {operationalMetrics.map((item) => (
          <StatsCard key={item.title} {...item} />
        ))}
      </div>
    </div>
  );
}
