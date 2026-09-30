"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { fetchClaim, fetchAIAnalysis, triggerAIProcessing } from "@/lib/api";
import { ClaimStatusBadge, RiskBadge } from "@/components/claims/claim-status-badge";
import { RiskScore } from "@/components/ai/risk-score";
import { DamageFindings, ImageQualityResults } from "@/components/ai/damage-findings";
import { SimilarityResults, ConsistencyResults, ExtractedFields } from "@/components/ai/similarity-results";
import { formatDate, formatCurrency, getRiskColor } from "@/lib/utils";
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
  const [claim, setClaim]       = useState<Claim | null>(null);
  const [ai, setAi]             = useState<AIAnalysis | null>(null);
  const [loading, setLoading]   = useState(true);
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
      <div className="space-y-4">
        <div className="skeleton h-12 w-64" />
        <div className="skeleton h-48 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
        <p className="text-xl font-semibold">Claim not found</p>
        <Link href="/claims" className="btn btn-secondary mt-4">← Back to Claims</Link>
      </div>
    );
  }

  const tabs = ["overview", "ai-analysis"];

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <Link href="/claims" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Claims</Link>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>{claim.claimNumber}</span>
      </div>

      {/* Header card */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold" style={{ fontFamily: "Space Grotesk" }}>{claim.claimNumber}</h2>
              <ClaimStatusBadge status={claim.status} />
              <RiskBadge risk={claim.riskLevel} />
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Submitted {formatDate(claim.submittedAt ?? claim.createdAt)} · Incident {formatDate(claim.incidentDate)}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {!claim.aiProcessed && !triggered && (
              <button
                id="run-ai-btn"
                className="btn btn-primary"
                onClick={handleTriggerAI}
                disabled={triggering}
              >
                {triggering ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Running…</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> Run AI Processing</>
                )}
              </button>
            )}
            {triggered && (
              <span className="badge animate-pulse" style={{ background: "rgba(6,182,212,0.1)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.3)", padding: "8px 12px" }}>
                ⏳ AI job queued
              </span>
            )}
            <button id="claim-action-evidence"  className="btn btn-secondary">Request Evidence</button>
            <button id="claim-action-investigate" className="btn" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", color: "#fb923c" }}>
              Flag for Investigation
            </button>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          {[
            { label: "Claimant",  value: claim.claimant.name, sub: claim.claimant.phone },
            { label: "Vehicle",   value: `${claim.vehicle.year} ${claim.vehicle.make} ${claim.vehicle.model}`, sub: claim.vehicle.plate },
            { label: "Policy",    value: claim.policy.policyNumber, sub: claim.policy.insurer },
            { label: "Estimate",  value: formatCurrency(claim.estimatedAmount), sub: claim.policy.type },
          ].map((info) => (
            <div key={info.label}>
              <div className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{info.label}</div>
              <div className="text-sm font-medium">{info.value}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{info.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {[
          { id: "overview",     label: "Overview" },
          { id: "ai-analysis",  label: "AI Analysis" },
        ].map((t) => (
          <button
            key={t.id}
            id={`claim-tab-${t.id}`}
            className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {t.id === "ai-analysis" && ai && (
              <span className="ml-2 badge" style={{ background: "rgba(16,185,129,0.1)", color: "#34d399", border: "none", fontSize: "0.65rem" }}>
                Done
              </span>
            )}
          </button>
        ))}
        {TAB_LINKS(claimId).slice(1).map((tl) => (
          <Link key={tl.href} href={tl.href} className="tab-btn" style={{ textDecoration: "none" }}>
            {tl.label}
          </Link>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Accident description */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-3">Accident Description</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {claim.accidentDescription}
            </p>
          </div>

          {/* Claim timeline */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-4">Claim Timeline</h3>
            <div className="relative pl-5">
              {[
                { label: "Incident occurred", date: claim.incidentDate, color: "#94a3b8" },
                { label: "Claim submitted",   date: claim.submittedAt ?? claim.createdAt, color: "#3b82f6" },
                ...(claim.aiProcessed ? [{ label: "AI processing complete", date: claim.aiProcessingAt ?? "", color: "#10b981" }] : []),
                ...(claim.closedAt ? [{ label: "Claim closed", date: claim.closedAt, color: "#8b5cf6" }] : []),
              ].map((event, i, arr) => (
                <div key={i} className="flex gap-3 pb-5 relative">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                    style={{ background: event.color, zIndex: 1, position: "relative" }}
                  />
                  {i < arr.length - 1 && (
                    <div className="absolute left-1.5 top-4 w-px h-full" style={{ background: "var(--border)", marginLeft: "-1px" }} />
                  )}
                  <div>
                    <div className="text-sm font-medium">{event.label}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(event.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence completeness */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Evidence Status</h3>
              <Link href={`/claims/${claimId}/evidence`} className="btn btn-ghost btn-sm">
                Upload Evidence →
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: claim.evidenceComplete ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)" }}
              >
                {claim.evidenceComplete ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#10b981">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#f59e0b">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: claim.evidenceComplete ? "#10b981" : "#f59e0b" }}>
                  {claim.evidenceComplete ? "Evidence complete" : "Evidence incomplete"}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {claim.evidenceComplete ? "All required photos and documents uploaded" : "Some required evidence is missing or low quality"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis tab */}
      {activeTab === "ai-analysis" && (
        <div className="space-y-4">
          {!ai ? (
            <div className="card p-8 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(6,182,212,0.1)" }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#06b6d4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-sm font-medium mb-1">AI analysis not yet run</p>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                Upload evidence and then trigger AI processing to see findings.
              </p>
              <button className="btn btn-primary" onClick={handleTriggerAI} disabled={triggering} id="ai-tab-trigger">
                Run AI Processing
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="card p-4" style={{ background: "rgba(59,130,246,0.05)" }}>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div><span style={{ color: "var(--text-muted)" }}>Model: </span><span className="font-mono font-medium">{ai.modelVersion}</span></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Processed in: </span><span className="font-medium">{ai.processingTime}s</span></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Status: </span><span className="font-medium text-emerald-400">{ai.status}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  <ImageQualityResults results={ai.imageQualityResults} />
                  <DamageFindings findings={ai.damageFindings} />
                  <SimilarityResults results={ai.similarityResults} />
                  <ConsistencyResults result={ai.consistencyResult} />
                  <ExtractedFields extractions={ai.documentExtractions} />
                </div>
                <div>
                  <RiskScore assessment={ai.riskAssessment} />
                  {/* Examiner actions */}
                  <div className="card p-5 mt-4">
                    <h4 className="text-sm font-semibold mb-3">Examiner Actions</h4>
                    <div className="space-y-2">
                      <button id="action-accept" className="btn btn-secondary w-full justify-start">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#10b981"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Accept AI Findings
                      </button>
                      <button id="action-correct" className="btn btn-secondary w-full justify-start">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#f59e0b"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        Correct Findings
                      </button>
                      <button id="action-investigate" className="btn btn-danger w-full justify-start">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        Escalate to Investigation
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
