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
}

const ACCENT_STYLES: Record<string, { bg: string; icon: string; glow: string }> = {
  blue:    { bg: "rgba(59,130,246,0.1)",   icon: "#3b82f6", glow: "rgba(59,130,246,0.15)" },
  amber:   { bg: "rgba(245,158,11,0.1)",   icon: "#f59e0b", glow: "rgba(245,158,11,0.15)" },
  emerald: { bg: "rgba(16,185,129,0.1)",   icon: "#10b981", glow: "rgba(16,185,129,0.15)" },
  purple:  { bg: "rgba(139,92,246,0.1)",   icon: "#8b5cf6", glow: "rgba(139,92,246,0.15)" },
  red:     { bg: "rgba(239,68,68,0.1)",    icon: "#ef4444", glow: "rgba(239,68,68,0.15)"  },
  cyan:    { bg: "rgba(6,182,212,0.1)",    icon: "#06b6d4", glow: "rgba(6,182,212,0.15)"  },
};

export function StatsCard({ title, value, subtitle, trend, accent = "blue", icon }: StatsCardProps) {
  const style = ACCENT_STYLES[accent];

  return (
    <div
      className="stat-card animate-fade-in-up"
      style={{ boxShadow: `0 4px 24px ${style.glow}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: style.bg }}
        >
          <span style={{ color: style.icon }}>{icon}</span>
        </div>
        {trend && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              background: trend.positive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              color: trend.positive ? "#10b981" : "#ef4444",
            }}
          >
            {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
        {value}
      </div>
      <div className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{title}</div>
      {subtitle && <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{subtitle}</div>}
    </div>
  );
}

// ── Stats Grid ───────────────────────────────
export function StatsGrid({ stats }: { stats: DashboardStats }) {
  const items = [
    {
      title: "Total Claims",
      value: stats.totalClaims.toLocaleString(),
      accent: "blue" as const,
      trend: { value: 12, positive: true },
      subtitle: "All time",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    },
    {
      title: "Open Claims",
      value: stats.openClaims.toLocaleString(),
      accent: "amber" as const,
      trend: { value: 8, positive: false },
      subtitle: "Pending resolution",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      title: "High Risk",
      value: stats.highRiskClaims,
      accent: "red" as const,
      trend: { value: 3, positive: false },
      subtitle: "Require investigation",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    },
    {
      title: "Avg Processing",
      value: `${stats.avgProcessingDays}d`,
      accent: "cyan" as const,
      trend: { value: 15, positive: true },
      subtitle: "Days to resolution",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    },
    {
      title: "This Month",
      value: stats.claimsThisMonth,
      accent: "purple" as const,
      trend: { value: 9, positive: true },
      subtitle: "New submissions",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    },
    {
      title: "AI Processed Today",
      value: stats.aiProcessedToday,
      accent: "emerald" as const,
      subtitle: "Claims analyzed by AI",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
    },
    {
      title: "Pending Evidence",
      value: stats.pendingEvidence,
      accent: "amber" as const,
      subtitle: "Missing documents/photos",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    },
    {
      title: "Closed This Month",
      value: stats.closedThisMonth,
      accent: "emerald" as const,
      trend: { value: 22, positive: true },
      subtitle: "Successfully resolved",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => <StatsCard key={item.title} {...item} />)}
    </div>
  );
}
