import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ClaimStatus, RiskLevel, ImageQuality, DamageSeverity } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "ETB") {
  return `${amount.toLocaleString("en-ET")} ${currency}`;
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatRelativeTime(date: string) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(date);
}

export function formatConfidence(conf: number) {
  return `${Math.round(conf * 100)}%`;
}

export function getStatusLabel(status: ClaimStatus): string {
  const labels: Record<ClaimStatus, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    EVIDENCE_CHECK: "Evidence Check",
    NEEDS_INFORMATION: "Needs Information",
    AI_PROCESSING: "AI Processing",
    TRIAGED: "Triaged",
    FAST_REVIEW: "Fast Review",
    EXAMINER: "Examiner Review",
    INVESTIGATION: "Investigation",
    CLOSED: "Closed",
  };
  return labels[status] ?? status;
}

export function getStatusColor(status: ClaimStatus): string {
  const colors: Record<ClaimStatus, string> = {
    DRAFT: "bg-slate-700 text-slate-200",
    SUBMITTED: "bg-blue-900 text-blue-200",
    EVIDENCE_CHECK: "bg-indigo-900 text-indigo-200",
    NEEDS_INFORMATION: "bg-yellow-900 text-yellow-200",
    AI_PROCESSING: "bg-cyan-900 text-cyan-200",
    TRIAGED: "bg-teal-900 text-teal-200",
    FAST_REVIEW: "bg-green-900 text-green-200",
    EXAMINER: "bg-purple-900 text-purple-200",
    INVESTIGATION: "bg-red-900 text-red-200",
    CLOSED: "bg-slate-800 text-slate-400",
  };
  return colors[status] ?? "bg-slate-700 text-slate-200";
}

export function getRiskColor(risk: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    LOW: "text-emerald-400",
    MEDIUM: "text-yellow-400",
    HIGH: "text-orange-400",
    CRITICAL: "text-purple-400",
  };
  return colors[risk];
}

export function getRiskBadgeColor(risk: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    LOW: "bg-emerald-900/60 text-emerald-300 border border-emerald-700",
    MEDIUM: "bg-yellow-900/60 text-yellow-300 border border-yellow-700",
    HIGH: "bg-orange-900/60 text-orange-300 border border-orange-700",
    CRITICAL: "bg-purple-900/60 text-purple-300 border border-purple-700",
  };
  return colors[risk];
}

export function getQualityColor(quality: ImageQuality): string {
  const colors: Record<ImageQuality, string> = {
    PASS: "text-emerald-400",
    LOW_CONFIDENCE: "text-yellow-400",
    FAIL: "text-red-400",
  };
  return colors[quality];
}

export function getSeverityColor(severity: DamageSeverity): string {
  const colors: Record<DamageSeverity, string> = {
    MINOR: "text-yellow-400",
    MODERATE: "text-orange-400",
    SEVERE: "text-red-400",
  };
  return colors[severity];
}
