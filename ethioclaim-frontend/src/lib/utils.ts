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
    DRAFT: "bg-white/10 text-white/80 border border-white/15",
    SUBMITTED: "bg-[#0A84FF]/15 text-[#64D2FF] border border-[#0A84FF]/30",
    EVIDENCE_CHECK: "bg-[#5E5CE6]/15 text-[#A5A6F6] border border-[#5E5CE6]/30",
    NEEDS_INFORMATION: "bg-[#FF9F0A]/15 text-[#FFD60A] border border-[#FF9F0A]/30",
    AI_PROCESSING: "bg-[#64D2FF]/15 text-[#64D2FF] border border-[#64D2FF]/30",
    TRIAGED: "bg-[#30D158]/15 text-[#70E08B] border border-[#30D158]/30",
    FAST_REVIEW: "bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30",
    EXAMINER: "bg-[#BF5AF2]/15 text-[#E39FF6] border border-[#BF5AF2]/30",
    INVESTIGATION: "bg-[#FF453A]/15 text-[#FF6961] border border-[#FF453A]/30",
    CLOSED: "bg-white/5 text-white/40 border border-white/10",
  };
  return colors[status] ?? "bg-white/10 text-white/80 border border-white/15";
}

export function getRiskColor(risk: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    LOW: "text-[#30D158]",
    MEDIUM: "text-[#FF9F0A]",
    HIGH: "text-[#FF453A]",
    CRITICAL: "text-[#BF5AF2]",
  };
  return colors[risk] ?? "text-white/60";
}

export function getRiskBadgeColor(risk: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    LOW: "bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30",
    MEDIUM: "bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30",
    HIGH: "bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/30",
    CRITICAL: "bg-[#BF5AF2]/15 text-[#BF5AF2] border border-[#BF5AF2]/30",
  };
  return colors[risk] ?? "bg-white/10 text-white/70 border border-white/15";
}

export function getQualityColor(quality: ImageQuality): string {
  const colors: Record<ImageQuality, string> = {
    PASS: "text-[#30D158]",
    LOW_CONFIDENCE: "text-[#FF9F0A]",
    FAIL: "text-[#FF453A]",
  };
  return colors[quality] ?? "text-white/60";
}

export function getSeverityColor(severity: DamageSeverity): string {
  const colors: Record<DamageSeverity, string> = {
    MINOR: "text-[#FFD60A]",
    MODERATE: "text-[#FF9F0A]",
    SEVERE: "text-[#FF453A]",
  };
  return colors[severity] ?? "text-white/60";
}
