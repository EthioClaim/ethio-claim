"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import {
  fetchClaim,
  updateClaim,
  updateClaimStatus,
  createAssessment,
  updateAssessment,
  fetchAssessment,
  recordClaimDecision,
  fetchClaimTimeline,
  requestClaimEvidence,
  getEvidenceFileUrl,
} from "@/lib/api";
import { ClaimStatusBadge } from "@/components/claims/claim-status-badge";
import { formatDate, formatDateTime, formatCurrency, getSeverityColor } from "@/lib/utils";
import type {
  Claim,
  ClaimStatus,
  ExaminerAssessment,
  AssessmentSeverity,
  ClaimTimelineEvent,
  ExaminerDecisionType,
  Policy,
} from "@/types";

const ALLOWED_STATUSES: { status: ClaimStatus; label: string }[] = [
  { status: "SUBMITTED", label: "Submitted" },
  { status: "PROCESSING", label: "AI Processing" },
  { status: "READY_FOR_REVIEW", label: "Ready For Review" },
  { status: "UNDER_REVIEW", label: "Under Review" },
  { status: "EVIDENCE_REQUESTED", label: "Evidence Requested" },
  { status: "NEED_MORE_EVIDENCE", label: "Need More Evidence" },
  { status: "ASSESSED", label: "Assessed" },
  { status: "APPROVED", label: "Approved" },
  { status: "REJECTED", label: "Rejected" },
  { status: "CLOSED", label: "Closed" },
];

export default function ClaimDetailPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = use(params);

  const [claim, setClaim] = useState<Claim | null>(null);
  const [assessment, setAssessment] = useState<ExaminerAssessment | null>(null);
  const [timeline, setTimeline] = useState<ClaimTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "assessment" | "timeline">("overview");

  // Notifications
  const [successMsg, setSuccessMsg] = useState("");

  // Status transition state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Assessment form state
  const [severity, setSeverity] = useState<AssessmentSeverity>("MODERATE");
  const [estimatedLoss, setEstimatedLoss] = useState<string>("45000");
  const [assessmentNotes, setAssessmentNotes] = useState<string>("");
  const [submittingAssessment, setSubmittingAssessment] = useState(false);

  // Final Decision state
  const [decisionType, setDecisionType] = useState<ExaminerDecisionType>("REFER_FOR_INSPECTION");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Evidence Request modal state
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [requestItem, setRequestItem] = useState("Clear photo of vehicle chassis / VIN and odometer");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestDeadline, setRequestDeadline] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Edit claim modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editClaimantPhone, setEditClaimantPhone] = useState("");
  const [editPlate, setEditPlate] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, a, t] = await Promise.allSettled([
        fetchClaim(claimId),
        fetchAssessment(claimId),
        fetchClaimTimeline(claimId),
      ]);

      if (c.status === "fulfilled") {
        setClaim(c.value);
        setEditClaimantPhone(c.value.claimant?.phone || "");
        setEditPlate(c.value.vehicle?.plate || "");
        setEditDesc(c.value.description || c.value.accidentDescription || "");
      }

      if (a.status === "fulfilled" && a.value) {
        setAssessment(a.value);
        setSeverity(a.value.severity);
        const loss = a.value.estimatedLossEtb ?? a.value.estimatedLossAmount ?? 45000;
        setEstimatedLoss(String(loss));
        setAssessmentNotes(a.value.notes || "");
      } else if (c.status === "fulfilled" && c.value.latestAssessment) {
        setAssessment(c.value.latestAssessment);
        setSeverity(c.value.latestAssessment.severity);
        const loss = c.value.latestAssessment.estimatedLossEtb ?? c.value.latestAssessment.estimatedLossAmount ?? 45000;
        setEstimatedLoss(String(loss));
        setAssessmentNotes(c.value.latestAssessment.notes || "");
      }

      if (t.status === "fulfilled") {
        setTimeline(t.value);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load claim details");
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function notify(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 5000);
  }

  async function handleStatusChange(newStatus: ClaimStatus) {
    if (!claim) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateClaimStatus(claim.id, newStatus);
      setClaim(updated);
      notify(`Claim status transitioned to ${newStatus.replace(/_/g, " ")}`);
      fetchClaimTimeline(claimId).then(setTimeline);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Status transition failed");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleSaveAssessment(e: React.FormEvent) {
    e.preventDefault();
    if (!claim) return;
    setSubmittingAssessment(true);
    setError("");

    try {
      if (assessment?.id) {
        const updated = await updateAssessment(claim.id, {
          severity,
          estimatedLossEtb: parseFloat(estimatedLoss) || 0,
          currency: "ETB",
          notes: assessmentNotes.trim(),
        });
        setAssessment(updated);
        notify("Assessment updated successfully");
      } else {
        const saved = await createAssessment(claim.id, {
          severity,
          estimatedLossEtb: parseFloat(estimatedLoss) || 0,
          currency: "ETB",
          notes: assessmentNotes.trim(),
        });
        setAssessment(saved);
        notify("Examiner assessment recorded");
        if (claim.status !== "ASSESSED" && claim.status !== "CLOSED") {
          const upd = await updateClaimStatus(claim.id, "ASSESSED");
          setClaim(upd);
        }
      }
      fetchClaimTimeline(claimId).then(setTimeline);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save assessment");
    } finally {
      setSubmittingAssessment(false);
    }
  }

  async function handleRecordDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!claim) return;
    setSubmittingDecision(true);
    setError("");

    try {
      await recordClaimDecision(claim.id, {
        decision: decisionType,
        notes: decisionNotes.trim(),
        estimatedLossEtb: parseFloat(estimatedLoss) || undefined,
      });
      notify(`Examiner decision recorded: ${decisionType.replace(/_/g, " ")}`);
      setDecisionNotes("");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record decision");
    } finally {
      setSubmittingDecision(false);
    }
  }

  async function handleRequestEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!claim) return;
    setSubmittingRequest(true);
    setError("");

    try {
      await requestClaimEvidence(claim.id, {
        item: requestItem.trim(),
        notes: requestNotes.trim() || undefined,
        deadline: requestDeadline || undefined,
      });
      notify("Evidence request dispatched to claimant");
      setShowEvidenceModal(false);
      setRequestNotes("");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to request evidence");
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!claim) return;
    setSavingEdit(true);
    try {
      const updated = await updateClaim(claim.id, {
        claimant: { phone: editClaimantPhone },
        vehicle: { plate: editPlate },
        incident: { description: editDesc },
      });
      setClaim(updated);
      setShowEditModal(false);
      notify("Claim fields updated successfully");
      fetchClaimTimeline(claimId).then(setTimeline);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update claim");
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="skeleton h-6 w-48 rounded-lg" />
        <div className="skeleton h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="card apple-glass p-16 text-center space-y-4">
        <p className="text-xl font-bold text-white">Claim Record Not Found</p>
        <p className="text-xs text-[var(--text-muted)]">
          The requested identifier <code className="font-mono text-[#64D2FF]">{claimId}</code> does not exist in registry.
        </p>
        <Link href="/claims" className="btn btn-secondary inline-flex mt-2 text-xs">
          ← Back to Claims List
        </Link>
      </div>
    );
  }

  const claimant = claim.claimant || { name: "Unknown", phone: "—" };
  const vehicle = claim.vehicle || { make: "Unknown", model: "Unknown", plate: "—" };
  const policy: Partial<Policy> = claim.policy || { policyNumber: claim.policyNumber || "—" };
  const evidenceList = claim.evidence || [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
        <Link href="/claims" className="hover:text-white transition-colors">
          Claims
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white font-mono font-semibold">{claim.claimNumber || claim.id}</span>
      </nav>

      {/* Header Showcase Card */}
      <div className="card apple-glass p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] font-mono">
                {claim.claimNumber || claim.id}
              </h2>
              <ClaimStatusBadge status={claim.status} />
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Intake registered {formatDate(claim.submittedAt || claim.createdAt)} • Incident date: {formatDate(claim.incidentDate)}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowEvidenceModal(true)}
              className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-[#FF9F0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Request Evidence</span>
            </button>

            <button
              onClick={() => setShowEditModal(true)}
              className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit Details</span>
            </button>

            <Link
              href={`/claims/${claim.id}/evidence`}
              id="claim-evidence-btn"
              className="btn btn-primary text-xs font-semibold py-2 px-4 shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Evidence & AI Inspection ({evidenceList.length || claim.evidenceCount || 0})</span>
            </Link>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-5 border-t border-[var(--border)]">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Insured Claimant</div>
            <div className="text-sm font-bold text-white tracking-tight">{claimant.name}</div>
            <div className="text-xs text-[var(--text-muted)] font-mono">{claimant.phone}</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Insured Vehicle</div>
            <div className="text-sm font-bold text-white tracking-tight">
              {vehicle.year ? `${vehicle.year} ` : ""}{vehicle.make} {vehicle.model}
            </div>
            <div className="text-xs text-[var(--text-muted)] font-mono">{vehicle.plate}</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Policy Registry</div>
            <div className="text-sm font-bold text-white font-mono tracking-tight">{policy.policyNumber}</div>
            <div className="text-xs text-[var(--text-muted)]">{policy.insurer || "Local Insurer Registry"}</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Initial Claim Estimate</div>
            <div className="text-sm font-bold text-[#64D2FF] font-mono tracking-tight">
              {formatCurrency(claim.estimatedAmount)}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Claimant intake estimate</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-[#30D158]/10 border border-[#30D158]/30 text-xs text-[#30D158] flex items-center gap-2">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="underline">Dismiss</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview & Details
        </button>
        <button
          className={`tab-btn ${activeTab === "assessment" ? "active" : ""}`}
          onClick={() => setActiveTab("assessment")}
        >
          Examiner Assessment & Decisions
        </button>
        <button
          className={`tab-btn ${activeTab === "timeline" ? "active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          Audit Timeline ({timeline.length})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Description */}
            <div className="card apple-glass p-6 space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em]">
                Collision Occurrence Description
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-normal whitespace-pre-wrap">
                {claim.description || claim.accidentDescription || "No incident description recorded."}
              </p>
            </div>

            {/* Evidence Quick Strip */}
            <div className="card apple-glass p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em]">
                    Evidence Photo Gallery
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {evidenceList.length} files attached
                  </p>
                </div>
                <Link
                  href={`/claims/${claim.id}/evidence`}
                  className="btn btn-secondary text-xs font-semibold py-1.5 px-3"
                >
                  Inspect & Upload →
                </Link>
              </div>

              {evidenceList.length === 0 ? (
                <div className="p-8 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-xl space-y-2">
                  <p className="text-xs text-[var(--text-muted)]">No photographic evidence uploaded yet.</p>
                  <Link
                    href={`/claims/${claim.id}/evidence`}
                    className="btn btn-primary text-xs inline-flex"
                  >
                    Upload Vehicle Photos
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {evidenceList.slice(0, 4).map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/claims/${claim.id}/evidence?evidenceId=${ev.id}`}
                      className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-white/[0.03] border border-white/10 hover:border-[#0A84FF] transition-all"
                    >
                      <img
                        src={ev.thumbnailUrl || ev.url || getEvidenceFileUrl(ev.id)}
                        alt={ev.originalFilename || ev.filename || "Evidence"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                        <span className="text-[10px] font-mono text-white truncate">
                          {ev.originalFilename || ev.filename || `Photo #${ev.id.slice(-4)}`}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Workflow Status Quick Actions */}
          <div className="space-y-6">
            <div className="card apple-glass p-6 space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.015em]">
                  Workflow Transitions
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Advance claim status through authorized stages
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {ALLOWED_STATUSES.map((s) => {
                  const isCurrent = claim.status === s.status;
                  return (
                    <button
                      key={s.status}
                      type="button"
                      disabled={updatingStatus || isCurrent}
                      onClick={() => handleStatusChange(s.status)}
                      className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                        isCurrent
                          ? "bg-[#0A84FF] text-white border-[#0A84FF] shadow-sm cursor-default"
                          : "bg-white/[0.04] text-[var(--text-secondary)] border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Assessment & Decision */}
      {activeTab === "assessment" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assessment Form (Section 2.6) */}
          <div className="card apple-glass p-6 space-y-5">
            <div className="border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-white tracking-tight">
                {assessment ? "Update Examiner Assessment" : "Record Human Assessment"}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Severity rating and loss calculation based on inspection or workshop estimate
              </p>
            </div>

            <form onSubmit={handleSaveAssessment} className="space-y-4">
              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Damage Severity (Manual Selection) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                  {(["MINOR", "MODERATE", "SEVERE", "UNDETERMINED"] as AssessmentSeverity[]).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`text-xs py-2 px-3 rounded-xl font-semibold border transition-all ${
                        severity === sev
                          ? "bg-[#0A84FF] text-white border-[#0A84FF] shadow-sm"
                          : "bg-white/[0.04] text-[var(--text-secondary)] border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="assessment-loss-amount" className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Estimated Loss in ETB (estimatedLossEtb) *
                </label>
                <div className="relative mt-1">
                  <input
                    id="assessment-loss-amount"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 45000.00"
                    className="input font-mono text-sm pr-14"
                    value={estimatedLoss}
                    onChange={(e) => setEstimatedLoss(e.target.value)}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-muted)]">
                    ETB
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="assessment-notes" className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Assessment Rationale / Inspection Notes *
                </label>
                <textarea
                  id="assessment-notes"
                  rows={3}
                  placeholder="Record basis of estimate, observed parts, garage quotation reference…"
                  className="input text-xs py-2 leading-relaxed mt-1"
                  value={assessmentNotes}
                  onChange={(e) => setAssessmentNotes(e.target.value)}
                  required
                />
              </div>

              <button
                id="save-assessment-btn"
                type="submit"
                disabled={submittingAssessment || !estimatedLoss}
                className="btn btn-primary w-full py-2.5 text-xs font-semibold shadow-sm flex items-center justify-center gap-2"
              >
                {submittingAssessment ? "Saving Assessment…" : assessment ? "Update Assessment" : "Save Examiner Assessment"}
              </button>
            </form>
          </div>

          {/* Final Examiner Decision (Section 2.6: POST /claims/:id/decision) */}
          <div className="card apple-glass p-6 space-y-5">
            <div className="border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-white tracking-tight">
                Record Final Examiner Decision
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Official determination logged into permanent audit ledger
              </p>
            </div>

            <form onSubmit={handleRecordDecision} className="space-y-4">
              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Decision Outcome *
                </label>
                <select
                  className="select w-full text-xs h-10 mt-1"
                  value={decisionType}
                  onChange={(e) => setDecisionType(e.target.value as ExaminerDecisionType)}
                >
                  <option value="REFER_FOR_INSPECTION">REFER_FOR_INSPECTION — Physical Garage Inspection Required</option>
                  <option value="RECOMMEND_APPROVAL">RECOMMEND_APPROVAL — Assessment Concurred, Recommend Approval</option>
                  <option value="RECOMMEND_REJECTION">RECOMMEND_REJECTION — Policy Exclusion / Non-concurrence</option>
                  <option value="FAST_TRACK">FAST_TRACK — Low Severity / Expedited Settlement</option>
                  <option value="ADDITIONAL_DOCUMENTS_REQUIRED">ADDITIONAL_DOCUMENTS_REQUIRED — Request More Details</option>
                </select>
              </div>

              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Decision Justification & Next Actions *
                </label>
                <textarea
                  rows={4}
                  placeholder="Summarize reasons for this decision outcome and required follow-up…"
                  className="input text-xs py-2 leading-relaxed mt-1"
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingDecision || !decisionNotes.trim()}
                className="btn btn-secondary w-full py-2.5 text-xs font-semibold border-[#0A84FF]/40 text-[#64D2FF] hover:bg-[#0A84FF]/10 flex items-center justify-center gap-2"
              >
                {submittingDecision ? "Logging Decision…" : "Commit Examiner Decision"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Timeline & Audit Events */}
      {activeTab === "timeline" && (
        <div className="card apple-glass p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Chronological Audit Timeline</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Full immutable audit log of claim state changes and staff decisions
              </p>
            </div>
            <button
              onClick={() => fetchClaimTimeline(claimId).then(setTimeline)}
              className="btn btn-secondary text-xs py-1.5 px-3"
            >
              Refresh Timeline
            </button>
          </div>

          {timeline.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              No audit events recorded yet.
            </div>
          ) : (
            <div className="space-y-4 pl-4 border-l border-white/10 relative">
              {timeline.map((evt, idx) => (
                <div key={evt.id || idx} className="relative group">
                  <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#0A84FF] ring-4 ring-[var(--bg-base)]" />
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white font-mono">{evt.action}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {formatDateTime(evt.createdAt)}
                      </span>
                    </div>
                    {evt.description && (
                      <p className="text-[var(--text-secondary)]">{evt.description}</p>
                    )}
                    {evt.actor && (
                      <span className="text-[10px] text-[var(--text-muted)] block">
                        By {typeof evt.actor === "string" ? evt.actor : evt.actor.name || evt.actor.role || "Staff"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Request More Evidence Modal (Section 2.3) */}
      {showEvidenceModal && (
        <div className="modal-overlay" onClick={() => setShowEvidenceModal(false)}>
          <div className="card apple-glass p-6 max-w-lg w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-white">Request Additional Evidence</h3>
              <button onClick={() => setShowEvidenceModal(false)} className="text-[var(--text-muted)] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRequestEvidence} className="space-y-4">
              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Requested Evidence Item *
                </label>
                <input
                  type="text"
                  className="input text-xs h-10 mt-1"
                  placeholder="e.g. Photo of vehicle damage from left side"
                  value={requestItem}
                  onChange={(e) => setRequestItem(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Instruction / Notes to Claimant
                </label>
                <textarea
                  rows={3}
                  className="input text-xs py-2 mt-1"
                  placeholder="Please upload high-resolution photos in bright daylight…"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                />
              </div>

              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Response Deadline
                </label>
                <input
                  type="date"
                  className="input text-xs h-10 mt-1"
                  value={requestDeadline}
                  onChange={(e) => setRequestDeadline(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="btn btn-primary text-xs py-2 px-5"
                >
                  {submittingRequest ? "Sending Request…" : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Claim Modal (Section 2.3: PATCH /claims/:id) */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="card apple-glass p-6 max-w-lg w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-white">Edit Claim Pre-Review Fields</h3>
              <button onClick={() => setShowEditModal(false)} className="text-[var(--text-muted)] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Claimant Phone
                </label>
                <input
                  type="text"
                  className="input text-xs h-10 mt-1"
                  value={editClaimantPhone}
                  onChange={(e) => setEditClaimantPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  License Plate
                </label>
                <input
                  type="text"
                  className="input text-xs font-mono uppercase h-10 mt-1"
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value)}
                />
              </div>

              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Occurrence Description
                </label>
                <textarea
                  rows={4}
                  className="input text-xs py-2 mt-1"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn btn-primary text-xs py-2 px-5"
                >
                  {savingEdit ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
