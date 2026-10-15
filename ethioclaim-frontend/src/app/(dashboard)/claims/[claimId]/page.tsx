"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { fetchClaim, fetchAIAnalysis, triggerAIProcessing } from "@/lib/api";
import { ClaimStatusBadge, RiskBadge } from "@/components/claims/claim-status-badge";
import { RiskScore } from "@/components/ai/risk-score";
import { DamageFindings, ImageQualityResults } from "@/components/ai/damage-findings";
import { SimilarityResults, ConsistencyResults, ExtractedFields } from "@/components/ai/similarity-results";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Claim, AIAnalysis } from "@/types";

const TAB_LINKS = (id: string) => [
  { label: "Overview",       href: `/claims/${id}` },
  { label: "Evidence",       href: `/claims/${id}/evidence` },
  { label: "Documents",      href: `/claims/${id}/documents` },
  { label: "AI Analysis",    href: `/claims/${id}/ai-analysis` },
  { label: "Investigation",  href: `/claims/${id}/investigation` },
  { label: "Decision",       href: `/claims/${id}/decision` },
];

export default function ClaimWorkspacePage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = use(params);
  const [claim, setClaim]           = useState<Claim | null>(null);
  const [ai, setAi]                 = useState<AIAnalysis | null>(null);
  const [loading, setLoading]       = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggered, setTriggered]   = useState(false);
  const [activeTab, setActiveTab]   = useState("overview");

  useEffect(() => {
    Promise.all([fetchClaim(claimId), fetchAIAnalysis(claimId)]).then(([c, a]) => {
      setClaim(c);
      setAi(a);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [claimId]);

  async function handleTriggerAI() {
    if (!claim) return;
    setTriggering(true);
    await triggerAIProcessing(claim.id);
    setTriggered(true);
    setTriggering(false);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="skeleton h-6 w-48 rounded-lg" />
        <div className="skeleton h-56 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="card apple-glass p-16 text-center text-[var(--text-muted)] space-y-4">
        <p className="text-xl font-bold text-white">Claim Record Not Found</p>
        <p className="text-xs">The requested claim identifier does not match any registered records.</p>
        <Link href="/claims" className="btn btn-secondary inline-flex mt-2">← Back to Claims List</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb Navigation (Apple Subtle Hierarchy) ── */}
      <nav className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
        <Link href="/claims" className="hover:text-white transition-colors text-[var(--text-muted)] no-underline">
          Claims
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white font-mono font-semibold">{claim.claimNumber}</span>
      </nav>

      {/* ── Header Showcase Card (Translucent Glass & High Contrast) ── */}
      <div className="card apple-glass p-6 md:p-7 flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] font-mono md:font-sans leading-tight">
                {claim.claimNumber}
              </h2>
              <ClaimStatusBadge status={claim.status} />
              <RiskBadge risk={claim.riskLevel} />
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Intake registered {formatDate(claim.submittedAt ?? claim.createdAt)} · Incident date: {formatDate(claim.incidentDate)}
            </p>
          </div>

          {/* Quick Action Controls with Instant Touch Feedback */}
          <div className="flex items-center gap-3 flex-wrap">
            {!claim.aiProcessed && !triggered && (
              <button
                id="run-ai-btn"
                className="btn btn-primary"
                onClick={handleTriggerAI}
                disabled={triggering}
              >
                {triggering ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    <span>Evaluating…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>Trigger AI Pipeline</span>
                  </>
                )}
              </button>
            )}

            {triggered && (
              <span className="badge px-3 py-1.5" style={{ background: "rgba(100,210,255,0.14)", color: "#64D2FF", border: "1px solid rgba(100,210,255,0.3)" }}>
                ⏳ Processing Queued
              </span>
            )}

            <button id="claim-action-evidence" className="btn btn-secondary">
              Request Evidence
            </button>
            <button 
              id="claim-action-investigate" 
              className="btn" 
              style={{ background: "rgba(255,159,10,0.12)", border: "1px solid rgba(255,159,10,0.3)", color: "#FF9F0A" }}
            >
              Flag for SIU
            </button>
          </div>
        </div>

        {/* Info Grid (Apple Clean Grouping & Contrast) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-5 border-t border-[var(--border)]">
          {[
            { label: "Insured Claimant", value: claim.claimant.name, sub: claim.claimant.phone },
            { label: "Insured Vehicle", value: `${claim.vehicle.year} ${claim.vehicle.make} ${claim.vehicle.model}`, sub: claim.vehicle.plate },
            { label: "Policy Coverage", value: claim.policy.policyNumber, sub: claim.policy.insurer },
            { label: "Loss Estimate", value: formatCurrency(claim.estimatedAmount), sub: claim.policy.type },
          ].map((info) => (
            <div key={info.label} className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{info.label}</div>
              <div className="text-sm font-bold text-white tracking-tight">{info.value}</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">{info.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Segmented Navigation Tabs (Apple Style) ── */}
      <div className="tabs">
        {[
          { id: "overview", label: "Overview" },
          { id: "ai-analysis", label: "AI Analysis" },
        ].map((t) => (
          <button
            key={t.id}
            id={`claim-tab-${t.id}`}
            className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span>{t.label}</span>
            {t.id === "ai-analysis" && ai && (
              <span className="ml-2 badge" style={{ background: "rgba(48,209,88,0.14)", color: "#30D158", border: "1px solid rgba(48,209,88,0.3)", fontSize: "0.65rem" }}>
                Ready
              </span>
            )}
          </button>
        ))}
        {TAB_LINKS(claimId).slice(1).map((tl) => (
          <Link key={tl.href} href={tl.href} className="tab-btn no-underline">
            {tl.label}
          </Link>
        ))}
      </div>

      {/* ── Overview Tab Content ── */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-6">
          {/* Incident Description */}
          <div className="card apple-glass p-6 md:p-7">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em] mb-3 leading-snug">
              Incident Occurrence Description
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
              {claim.accidentDescription}
            </p>
          </div>

          {/* Claim Lifecycle Timeline */}
          <div className="card apple-glass p-6 md:p-7">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em] mb-5 leading-snug">
              Audit & Processing Timeline
            </h3>
            <div className="relative pl-6 flex flex-col gap-5">
              {[
                { label: "Collision occurred", date: claim.incidentDate, color: "#64D2FF" },
                { label: "Claim submitted to carrier", date: claim.submittedAt ?? claim.createdAt, color: "#0A84FF" },
                ...(claim.aiProcessed ? [{ label: "Computer vision analysis completed", date: claim.aiProcessingAt ?? "", color: "#30D158" }] : []),
                ...(claim.closedAt ? [{ label: "Claim adjudication closed", date: claim.closedAt, color: "#BF5AF2" }] : []),
              ].map((event, i, arr) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5 shadow-sm"
                    style={{ background: event.color, zIndex: 1, position: "relative" }}
                  />
                  {i < arr.length - 1 && (
                    <div className="absolute left-[6px] top-4.5 w-px h-[calc(100%+1.25rem)] bg-white/10" />
                  )}
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-semibold text-white leading-snug">{event.label}</div>
                    <div className="text-[11px] text-[var(--text-muted)] font-mono">{formatDate(event.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Completeness Status */}
          <div className="card apple-glass p-6 md:p-7">
            <div className="flex items-center justify-between mb-4 gap-4">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em] leading-snug">Evidence Completeness</h3>
              <Link href={`/claims/${claimId}/evidence`} className="btn btn-ghost btn-sm text-xs font-semibold text-[#0A84FF]">
                Inspect Uploads →
              </Link>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: claim.evidenceComplete ? "rgba(48,209,88,0.14)" : "rgba(255,159,10,0.14)",
                  border: `1px solid ${claim.evidenceComplete ? "rgba(48,209,88,0.3)" : "rgba(255,159,10,0.3)"}`
                }}
              >
                {claim.evidenceComplete ? (
                  <svg className="w-5 h-5 text-[#30D158]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-[#FF9F0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div>
                <div className="text-xs font-bold leading-snug" style={{ color: claim.evidenceComplete ? "#30D158" : "#FF9F0A" }}>
                  {claim.evidenceComplete ? "Full Inspection Package Verified" : "Incomplete Photo Set Uploaded"}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  {claim.evidenceComplete ? "All mandatory 4-angle vehicle photos and police records verified." : "Some angles or document pages require re-submission."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Analysis Tab Content ── */}
      {activeTab === "ai-analysis" && (
        <div className="space-y-5">
          {!ai ? (
            <div className="card apple-glass p-12 text-center space-y-3">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-sm"
                style={{ background: "rgba(100,210,255,0.12)", border: "1px solid rgba(100,210,255,0.25)" }}
              >
                <svg className="w-7 h-7 text-[#64D2FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-base font-bold text-white">AI Analysis Not Yet Triggered</p>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                Trigger the model to execute vehicle damage localization, police report OCR extraction, and similarity cross-matching.
              </p>
              <button className="btn btn-primary mt-2" onClick={handleTriggerAI} disabled={triggering} id="ai-tab-trigger">
                Run AI Pipeline Now
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Model Execution Stats Strip */}
              <div className="card apple-glass p-4 border border-[#0A84FF]/20 bg-[#0A84FF]/[0.04]">
                <div className="flex flex-wrap items-center gap-6 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)]">Model Architecture: </span>
                    <span className="font-mono font-semibold text-white">{ai.modelVersion}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Inference Latency: </span>
                    <span className="font-mono font-semibold text-[#64D2FF]">{ai.processingTime}s</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Execution Status: </span>
                    <span className="font-semibold text-[#30D158]">{ai.status}</span>
                  </div>
                </div>
              </div>

              {/* Grid: Findings & Risk Assessment */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                  <ImageQualityResults results={ai.imageQualityResults} />
                  <DamageFindings findings={ai.damageFindings} />
                  <SimilarityResults results={ai.similarityResults} />
                  <ConsistencyResults result={ai.consistencyResult} />
                  <ExtractedFields extractions={ai.documentExtractions} />
                </div>
                
                <div className="space-y-5">
                  <RiskScore assessment={ai.riskAssessment} />
                  
                  {/* Examiner Review Actions */}
                  <div className="card apple-glass p-5 md:p-6">
                    <h4 className="text-sm font-bold text-white mb-3.5 tracking-[-0.015em] leading-snug">
                      Examiner Determination
                    </h4>
                    <div className="flex flex-col gap-2.5">
                      <button id="action-accept" className="btn btn-secondary w-full justify-start text-xs font-semibold p-3 gap-2.5">
                        <svg className="w-4 h-4 text-[#30D158]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Accept AI Findings & Route
                      </button>
                      <button id="action-correct" className="btn btn-secondary w-full justify-start text-xs font-semibold p-3 gap-2.5">
                        <svg className="w-4 h-4 text-[#FF9F0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Adjust / Override Findings
                      </button>
                      <button id="action-investigate" className="btn btn-danger w-full justify-start text-xs font-semibold p-3 gap-2.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Escalate to Fraud Investigation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
