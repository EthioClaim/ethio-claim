"use client";

import Link from "next/link";
import type { Claim } from "@/types";
import { getStatusColor, getStatusLabel, getRiskBadgeColor, formatDate } from "@/lib/utils";

export function RecentClaims({ claims }: { claims: Claim[] }) {
  return (
    <div className="card apple-glass flex flex-col">
      {/* Card Header with Optical Typography & Separation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-6 py-5 border-b border-[var(--border)]">
        <div>
          <h3 className="text-[15px] sm:text-base font-bold text-white tracking-[-0.02em] leading-snug mb-1">
            Recent Claims Activity
          </h3>
          <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed">
            Real-time feed across assigned insurance examiners
          </p>
        </div>
        <Link 
          href="/claims" 
          className="btn btn-ghost btn-sm text-xs font-semibold text-[#0A84FF] hover:text-[#64D2FF] hover:bg-[#0A84FF]/10 transition-colors self-start sm:self-auto"
        >
          View All Claims →
        </Link>
      </div>

      {/* Inset Grouped Claims List */}
      <div className="divide-y divide-[var(--border)]">
        {claims.slice(0, 5).map((claim) => (
          <Link
            key={claim.id}
            href={`/claims/${claim.id}`}
            className="group flex items-center gap-4 px-6 py-4.5 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer text-inherit no-underline select-none active:scale-[0.99] active:bg-white/[0.07]"
            style={{ transitionTimingFunction: "var(--spring-crit)" }}
          >
            {/* Claim Identification Pill */}
            <div className="flex-shrink-0 w-36">
              <div className="text-sm font-mono font-semibold text-[#64D2FF] group-hover:text-white transition-colors">
                {claim.claimNumber}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {formatDate(claim.createdAt)}
              </div>
            </div>

            {/* Claimant & Vehicle Info */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="text-sm font-semibold truncate text-[var(--text-primary)] tracking-[-0.01em]">
                {claim.claimant.name}
              </div>
              <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                {claim.vehicle.year} {claim.vehicle.make} {claim.vehicle.model} · <span className="font-mono text-[var(--text-secondary)]">{claim.vehicle.plate}</span>
              </div>
            </div>

            {/* Status & Risk Badges (Apple Vibrancy Style) */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <span className={`badge ${getStatusColor(claim.status)}`}>
                {getStatusLabel(claim.status)}
              </span>
              <span className={`badge ${getRiskBadgeColor(claim.riskLevel)}`}>
                {claim.riskLevel}
              </span>
              
              {/* Subtle Chevron Accessory */}
              <svg 
                className="w-4 h-4 text-[var(--text-muted)] group-hover:text-white group-hover:translate-x-0.5 transition-all ml-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
