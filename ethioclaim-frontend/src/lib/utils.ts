import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ClaimStatus, RiskLevel, AssessmentSeverity } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | undefined | null, currency = "ETB") {
  if (amount === undefined || amount === null || amount === "") return `0 ${currency}`;
  const num = typeof amount === "number" ? amount : parseFloat(String(amount)) || 0;
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

export function formatDate(date: string | undefined | null) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(date);
  }
}

export function formatDateTime(date: string | undefined | null) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(date);
  }
}

export function formatRelativeTime(date: string | undefined | null) {
  if (!date) return "—";
  try {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(date);
  } catch {
    return formatDate(date);
  }
}

export function formatConfidence(conf: number | undefined | null) {
  if (conf === undefined || conf === null) return "—";
  return `${Math.round(conf * 100)}%`;
}

export function getStatusLabel(status: ClaimStatus | string): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    POLICY_UNVERIFIED: "Policy Unverified",
    PROCESSING: "AI Processing",
    READY_FOR_REVIEW: "Ready For Review",
    UNDER_REVIEW: "Under Review",
    EVIDENCE_REQUESTED: "Evidence Requested",
    NEED_MORE_EVIDENCE: "Need More Evidence",
    ASSESSED: "Assessed",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    CLOSED: "Closed",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function getStatusColor(status: ClaimStatus | string): string {
  const colors: Record<string, string> = {
    DRAFT: "bg-white/10 text-white/80 border border-white/15",
    SUBMITTED: "bg-[#0A84FF]/15 text-[#64D2FF] border border-[#0A84FF]/30",
    POLICY_UNVERIFIED: "bg-[#FF9F0A]/15 text-[#FFD60A] border border-[#FF9F0A]/30",
    PROCESSING: "bg-[#64D2FF]/15 text-[#64D2FF] border border-[#64D2FF]/30",
    READY_FOR_REVIEW: "bg-[#30D158]/15 text-[#70E08B] border border-[#30D158]/30",
    UNDER_REVIEW: "bg-[#BF5AF2]/15 text-[#E39FF6] border border-[#BF5AF2]/30",
    EVIDENCE_REQUESTED: "bg-[#FF9F0A]/15 text-[#FFD60A] border border-[#FF9F0A]/30",
    NEED_MORE_EVIDENCE: "bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30",
    ASSESSED: "bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40",
    APPROVED: "bg-[#30D158]/25 text-[#30D158] border border-[#30D158]/50",
    REJECTED: "bg-[#FF453A]/20 text-[#FF6961] border border-[#FF453A]/40",
    CLOSED: "bg-white/5 text-white/40 border border-white/10",
  };
  return colors[status] ?? "bg-white/10 text-white/80 border border-white/15";
}

export function getRiskColor(risk: RiskLevel | string): string {
  const colors: Record<string, string> = {
    LOW: "text-[#30D158]",
    MEDIUM: "text-[#FF9F0A]",
    HIGH: "text-[#FF453A]",
    CRITICAL: "text-[#BF5AF2]",
  };
  return colors[risk] ?? "text-white/60";
}

export function getRiskBadgeColor(risk: RiskLevel | string): string {
  const colors: Record<string, string> = {
    LOW: "bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30",
    MEDIUM: "bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30",
    HIGH: "bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/30",
    CRITICAL: "bg-[#BF5AF2]/15 text-[#BF5AF2] border border-[#BF5AF2]/30",
  };
  return colors[risk] ?? "bg-white/10 text-white/70 border border-white/15";
}

export function getSeverityColor(severity: AssessmentSeverity | string): string {
  const colors: Record<string, string> = {
    MINOR: "text-[#30D158] bg-[#30D158]/10 border border-[#30D158]/30",
    MODERATE: "text-[#FF9F0A] bg-[#FF9F0A]/10 border border-[#FF9F0A]/30",
    SEVERE: "text-[#FF453A] bg-[#FF453A]/10 border border-[#FF453A]/30",
    UNDETERMINED: "text-white/70 bg-white/10 border border-white/20",
  };
  return colors[severity] ?? "text-white/60 bg-white/5 border border-white/10";
}
