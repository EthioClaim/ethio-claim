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
  getAuthenticatedEvidenceUrl,
  submitClaim,
  assignExaminer,
  closeClaim,
  fetchAdminUsers,
  fetchCurrentUser,
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
  AdminUser,
  CurrentUser,
} from "@/types";

export default function ClaimDetailPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = use(params);

  const [claim, setClaim] = useState<Claim | null>(null);
  const [assessment, setAssessment] = useState<ExaminerAssessment | null>(null);
  const [timeline, setTimeline] = useState<ClaimTimelineEvent[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
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
  const [fraudAcknowledged, setFraudAcknowledged] = useState(false);

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

  // Submit Draft modal state (for Intake User)
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitNotes, setSubmitNotes] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Assign Examiner modal state (for Admin)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [examinersList, setExaminersList] = useState<AdminUser[]>([]);
  const [selectedExaminerId, setSelectedExaminerId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assigningExaminer, setAssigningExaminer] = useState(false);

  // Close Claim modal state (for Admin)
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeReason, setCloseReason] = useState("SETTLED");
  const [closeNotes, setCloseNotes] = useState("");
  const [closingClaim, setClosingClaim] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Load current user profile from localStorage or API
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("ethioclaim_user");
          if (raw) setCurrentUser(JSON.parse(raw));
        } catch {
          // ignore
        }
      }
      fetchCurrentUser().then(setCurrentUser).catch(() => {});

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

  async function handleOpenAssignModal() {
    setShowAssignModal(true);
    try {
      const users = await fetchAdminUsers();
      const exList = (users || []).filter((u: AdminUser) => u.role === "EXAMINER");
      setExaminersList(exList.length > 0 ? exList : (users || []));
      if (exList.length > 0 && !selectedExaminerId) {
        setSelectedExaminerId(exList[0].id);
      } else if (users && users.length > 0 && !selectedExaminerId) {
        setSelectedExaminerId(users[0].id);
      }
    } catch {
      // ignore
    }
  }

  function notify(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 5000);
  }

  // Handle Submit Claim (Intake User)
  async function handleSubmitClaimConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!claim) return;
    setSubmittingClaim(true);
    setError("");
    try {
      const updated = await submitClaim(claim.id, submitNotes.trim() || undefined);
      setClaim(updated);
      setShowSubmitModal(false);
      notify("Claim submitted successfully for examiner review!");
      fetchClaimTimeline(claimId).then(setTimeline);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit claim");
    } finally {
      setSubmittingClaim(false);
    }
  }

  // Handle Assign Examiner (Admin)
  async function handleAssignExaminerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claim || !selectedExaminerId) return;
    setAssigningExaminer(true);
    setError("");
    try {
      await assignExaminer(claim.id, selectedExaminerId, assignNote.trim() || undefined);
      setShowAssignModal(false);
      notify("Examiner assigned successfully!");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign examiner");
    } finally {
      setAssigningExaminer(false);
    }
  }

  // Handle Close Claim (Admin)
  async function handleCloseClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claim) return;
    setClosingClaim(true);
    setError("");
    try {
      await closeClaim(claim.id, closeReason, closeNotes.trim() || undefined);
      setShowCloseModal(false);
      notify("Claim closed successfully!");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to close claim");
    } finally {
      setClosingClaim(false);
    }
  }

  // Handle Transition
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
      const message = requestNotes.trim()
        ? `${requestItem.trim()} - ${requestNotes.trim()}`
        : requestItem.trim();

      await requestClaimEvidence(claim.id, {
        message,
        requestedItems: [requestItem.trim()],
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

  const role = currentUser?.role;
  const isIntakeUser = role === "INTAKE_USER";
  const isExaminer = role === "EXAMINER";
  const isAdmin = role === "ADMIN";

  const claimant = claim.claimant || { name: (claim as any).claimantFullName || (claim as any).claimantName || "Not provided", phone: "—" };
  const claimantDisplayName =
    claimant.fullName ||
    claimant.name ||
    (claim as any).claimantFullName ||
    (claim as any).claimantName ||
    "Not provided";
  const vehicle = claim.vehicle || { make: "Unknown", model: "Unknown", plate: "—" };
  const policy: Partial<Policy> = claim.policy || { policyNumber: claim.policyNumber || "—" };
  const evidenceList = claim.evidence || [];
  const assignedExaminerInfo = (claim as any).assignedExaminer || (claim as any).assessment?.examiner;

  // Resolve AI risk assessment from top-level or child evidence analyses
  const aiRiskAssessment =
    claim.aiRiskAssessment ||
    (evidenceList as any[]).find((e) => e.analysis?.detections?.riskAssessment?.label === "POTENTIAL_FRAUD")?.analysis?.detections?.riskAssessment ||
    (evidenceList as any[]).find((e) => e.riskAssessment?.label === "POTENTIAL_FRAUD")?.riskAssessment;

  // Allowed transitions based on user role
  const allowedTransitions = isExaminer
    ? [
        { status: "UNDER_REVIEW" as ClaimStatus, label: "Under Review" },
        { status: "NEED_MORE_EVIDENCE" as ClaimStatus, label: "Need More Evidence" },
        { status: "ASSESSED" as ClaimStatus, label: "Assessed" },
      ]
    : isAdmin
    ? [
        { status: "READY_FOR_REVIEW" as ClaimStatus, label: "Ready For Review" },
        { status: "UNDER_REVIEW" as ClaimStatus, label: "Under Review" },
        { status: "NEED_MORE_EVIDENCE" as ClaimStatus, label: "Need More Evidence" },
        { status: "ASSESSED" as ClaimStatus, label: "Assessed" },
        { status: "APPROVED" as ClaimStatus, label: "Approved" },
        { status: "REJECTED" as ClaimStatus, label: "Rejected" },
        { status: "CLOSED" as ClaimStatus, label: "Closed" },
      ]
    : [];

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

      {/* AI Potential Fraud Warning Banner */}
      {aiRiskAssessment?.label === "POTENTIAL_FRAUD" && (
        <div className="card apple-glass p-5 border-l-4 border-l-[#FF453A] bg-gradient-to-r from-[#FF453A]/15 to-transparent space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#FF453A]">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>POTENTIAL FRAUD FLAGGED BY AI VISION SCREENING</span>
            </div>
            <span className="badge text-[10px] bg-[#FF453A]/20 text-[#FF6961] border border-[#FF453A]/30 font-mono">
              REQUIRES MANUAL REVIEW
            </span>
          </div>
          <div className="text-xs text-[var(--text-secondary)] space-y-1.5 pl-7">
            <p className="font-semibold text-white">Screening Reasons:</p>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
              {aiRiskAssessment.reasons?.map((r: string, idx: number) => (
                <li key={idx}>{r}</li>
              )) || <li>Duplicate evidence or image signature matched against an existing claim.</li>}
            </ul>
            {Boolean(aiRiskAssessment.matchedClaimIds?.length || aiRiskAssessment.matchedEvidenceIds?.length) && (
              <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                {aiRiskAssessment.matchedClaimIds?.map((cid: string) => (
                  <Link key={cid} href={`/claims/${cid}`} className="text-[#64D2FF] hover:underline bg-white/5 px-2 py-0.5 rounded">
                    Matched Claim: {cid.slice(0, 8)}…
                  </Link>
                ))}
              </div>
            )}
            <p className="text-[11px] text-[var(--text-muted)] italic pt-1">
              Disclaimer: AI Vision screening is an assistive detection aid. Examiners must manually inspect matching evidence photos before finalizing adjudication.
            </p>
          </div>
        </div>
      )}

      {/* Role-Specific Alert Banners */}
      {isIntakeUser && claim.status === "DRAFT" && (
        <div className="card apple-glass p-5 border-l-4 border-l-[#0A84FF] flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#0A84FF]/10 to-transparent">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="w-2 h-2 rounded-full bg-[#0A84FF] animate-ping" />
              <span>Draft Claim — Not Submitted</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Complete your incident details, upload vehicle photos, and submit for claims examination.
            </p>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="btn btn-primary text-xs py-2.5 px-5 font-semibold flex items-center gap-2 shadow-lg shadow-[#0A84FF]/25"
          >
            <span>Submit Claim for Review →</span>
          </button>
        </div>
      )}

      {claim.status === "NEED_MORE_EVIDENCE" && (
        <div className="card apple-glass p-5 border-l-4 border-l-[#FF9F0A] flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#FF9F0A]/10 to-transparent">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-[#FF9F0A]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Examiner Requested Additional Evidence</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              The claims examiner has paused review pending submission of additional photos or garage documents.
            </p>
          </div>
          <Link
            href={`/claims/${claim.id}/evidence`}
            className="btn btn-primary text-xs py-2 px-4 bg-[#FF9F0A] hover:bg-[#FF9F0A]/90 text-black font-semibold flex items-center gap-2"
          >
            <span>Upload Requested Photos →</span>
          </Link>
        </div>
      )}

      {/* Header Showcase Card */}
      <div className="card apple-glass p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] font-mono">
                {claim.claimNumber || claim.id}
              </h2>
              <ClaimStatusBadge status={claim.status} />
              {assignedExaminerInfo && (
                <span className="badge badge-secondary text-[11px] font-medium border border-white/10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#64D2FF]" />
                  <span>Examiner: {assignedExaminerInfo.name || assignedExaminerInfo.email || "Assigned"}</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Intake registered {formatDate(claim.submittedAt || claim.createdAt)} • Incident date: {formatDate(claim.incidentDate)}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* INTAKE Actions */}
            {isIntakeUser && claim.status === "DRAFT" && (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="btn btn-primary text-xs py-2 px-4 font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <span>Submit Claim</span>
              </button>
            )}

            {/* EXAMINER Actions */}
            {(isExaminer || isAdmin) && (
              <button
                onClick={() => setShowEvidenceModal(true)}
                className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-[#FF9F0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Request Evidence</span>
              </button>
            )}

            {/* ADMIN Actions */}
            {isAdmin && (
              <>
                <button
                  onClick={handleOpenAssignModal}
                  className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 border-[#64D2FF]/30 text-[#64D2FF] hover:bg-[#64D2FF]/10"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Assign Examiner</span>
                </button>

                {claim.status !== "CLOSED" && (
                  <button
                    onClick={() => setShowCloseModal(true)}
                    className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 border-[#FF453A]/30 text-[#FF6961] hover:bg-[#FF453A]/10"
                  >
                    <span>Close Claim</span>
                  </button>
                )}
              </>
            )}

            {/* Edit details (allowed for Intake when Draft, or Examiner/Admin) */}
            {(claim.status === "DRAFT" || isExaminer || isAdmin) && (
              <button
                onClick={() => setShowEditModal(true)}
                className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Edit Details</span>
              </button>
            )}

            <Link
              href={`/claims/${claim.id}/evidence`}
              id="claim-evidence-btn"
              className="btn btn-primary text-xs font-semibold py-2 px-4 shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Evidence Gallery ({evidenceList.length || claim.evidenceCount || 0})</span>
            </Link>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-5 border-t border-[var(--border)]">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Insured Claimant</div>
            <div className="text-sm font-bold text-white tracking-tight">{claimantDisplayName}</div>
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
        {(isExaminer || isAdmin) && (
          <button
            className={`tab-btn ${activeTab === "assessment" ? "active" : ""}`}
            onClick={() => setActiveTab("assessment")}
          >
            Examiner Assessment & Decisions
          </button>
        )}
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
                        src={getAuthenticatedEvidenceUrl(ev)}
                        alt={ev.originalFilename || ev.filename || "Evidence"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLElement;
                          target.style.display = "none";
                          const fallback = target.parentElement?.querySelector(".thumb-fallback");
                          if (fallback) (fallback as HTMLElement).style.display = "flex";
                        }}
                      />
                      <div className="thumb-fallback hidden w-full h-full items-center justify-center text-xs text-[var(--text-muted)] bg-white/5">
                        📷
                      </div>
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

          {/* Workflow Status Quick Actions (Restricted to Examiner / Admin) */}
          <div className="space-y-6">
            {(isExaminer || isAdmin) ? (
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
                  {allowedTransitions.map((s) => {
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
            ) : (
              <div className="card apple-glass p-6 space-y-3">
                <h3 className="text-sm font-bold text-white">Intake Status Note</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  As an intake officer, your submission is routed to an assigned claims examiner for damage analysis and coverage review.
                </p>
                {claim.status === "DRAFT" && (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="btn btn-primary w-full text-xs py-2.5 font-semibold mt-2"
                  >
                    Submit for Review
                  </button>
                )}
              </div>
            )}

            {/* Quick Summary Card */}
            <div className="card apple-glass p-6 space-y-3 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">System Metadata</h4>
              <div className="space-y-2 text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Claim ID</span>
                  <span className="font-mono text-white text-[11px] truncate max-w-[140px]">{claim.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Created</span>
                  <span>{formatDate(claim.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Examiner</span>
                  <span>{assignedExaminerInfo?.name || "Unassigned"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Assessment & Decision (Staff Only) */}
      {activeTab === "assessment" && (isExaminer || isAdmin) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assessment Form */}
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                    Damage Severity (Manual Selection) *
                  </label>
                  {claim.aiSuggestedSeverity && (
                    <div className="flex items-center gap-1.5">
                      <span className="badge text-[10px] bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/30 font-mono">
                        AI Suggested: {claim.aiSuggestedSeverity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSeverity(claim.aiSuggestedSeverity as AssessmentSeverity)}
                        className="text-[10px] text-[#0A84FF] hover:underline font-semibold"
                      >
                        Use Suggestion
                      </button>
                    </div>
                  )}
                </div>
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

          {/* Final Examiner Decision */}
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

              {/* If AI flagged POTENTIAL_FRAUD, require acknowledgment before committing decision */}
              {aiRiskAssessment?.label === "POTENTIAL_FRAUD" && (
                <div className="p-3.5 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="ack-fraud-flag"
                      checked={fraudAcknowledged}
                      onChange={(e) => setFraudAcknowledged(e.target.checked)}
                      className="mt-0.5 rounded border-white/20 text-[#FF453A] focus:ring-0"
                    />
                    <label htmlFor="ack-fraud-flag" className="text-xs text-[#FF6961] leading-tight select-none cursor-pointer">
                      I have reviewed the flagged potential fraud indicators and am proceeding with this rationale.
                    </label>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  submittingDecision ||
                  !decisionNotes.trim() ||
                  (aiRiskAssessment?.label === "POTENTIAL_FRAUD" && !fraudAcknowledged)
                }
                className="btn btn-secondary w-full py-2.5 text-xs font-semibold border-[#0A84FF]/40 text-[#64D2FF] hover:bg-[#0A84FF]/10 flex items-center justify-center gap-2 disabled:opacity-50"
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

      {/* Modal: Submit Draft Claim (Intake User) */}
      {showSubmitModal && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="card apple-glass p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-white">Submit Claim for Review</h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-[var(--text-muted)] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitClaimConfirm} className="space-y-4">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Submitting this claim will transition its status from <strong>DRAFT</strong> to <strong>SUBMITTED</strong>, queueing it for triage and examiner assignment.
              </p>

              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Submission Notes / Intake Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  className="input text-xs py-2 mt-1"
                  placeholder="Any immediate notes for the assigned examiner…"
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="btn btn-primary text-xs py-2 px-5 font-semibold"
                >
                  {submittingClaim ? "Submitting…" : "Confirm Submission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Examiner (Admin Only) */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="card apple-glass p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-white">Assign Claims Examiner</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-[var(--text-muted)] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAssignExaminerSubmit} className="space-y-4">
              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Select Examiner *
                </label>
                <select
                  className="select w-full text-xs h-10 mt-1"
                  value={selectedExaminerId}
                  onChange={(e) => setSelectedExaminerId(e.target.value)}
                  required
                >
                  <option value="">— Select an Examiner —</option>
                  {examinersList.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.displayName || ex.username || ex.email} ({ex.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Assignment Note / Priority Instructions
                </label>
                <textarea
                  rows={3}
                  className="input text-xs py-2 mt-1"
                  placeholder="e.g. Priority inspection requested by insurance partner…"
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningExaminer || !selectedExaminerId}
                  className="btn btn-primary text-xs py-2 px-5 font-semibold"
                >
                  {assigningExaminer ? "Assigning…" : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Close Claim (Admin Only) */}
      {showCloseModal && (
        <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="card apple-glass p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-white">Close Claim File</h3>
              <button onClick={() => setShowCloseModal(false)} className="text-[var(--text-muted)] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCloseClaimSubmit} className="space-y-4">
              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Closure Reason *
                </label>
                <select
                  className="select w-full text-xs h-10 mt-1"
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                >
                  <option value="SETTLED">SETTLED — Indemnity disbursed / Repair voucher completed</option>
                  <option value="WITHDRAWN">WITHDRAWN — Claimant dropped claim</option>
                  <option value="DENIED_FINAL">DENIED_FINAL — Claim denied and formal notice served</option>
                  <option value="ADMIN_OVERRIDE">ADMIN_OVERRIDE — Administrative closure</option>
                </select>
              </div>

              <div>
                <label className="label text-xs uppercase text-[var(--text-muted)] font-semibold">
                  Closure Notes / Final Settlement Details
                </label>
                <textarea
                  rows={3}
                  className="input text-xs py-2 mt-1"
                  placeholder="Record payout amount voucher #, or policy exclusion grounds…"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closingClaim}
                  className="btn btn-secondary text-xs py-2 px-5 border-[#FF453A]/40 text-[#FF6961] hover:bg-[#FF453A]/10 font-semibold"
                >
                  {closingClaim ? "Closing…" : "Finalize Closure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Request More Evidence */}
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

      {/* Modal: Edit Claim Pre-Review Fields */}
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
