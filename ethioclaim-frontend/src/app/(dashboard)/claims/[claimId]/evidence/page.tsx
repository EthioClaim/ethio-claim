"use client";

import { useEffect, useState, use, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchClaimEvidence,
  uploadClaimEvidence,
  getEvidenceFileUrl,
  getAuthenticatedEvidenceUrl,
  deleteEvidence,
  fetchEvidenceAnalysis,
  reanalyzeEvidence,
  fetchEvidenceMatches,
  fetchCurrentUser,
} from "@/lib/api";
import { DamageFindings } from "@/components/ai/damage-findings";
import { SimilarityResults } from "@/components/ai/similarity-results";
import { formatDate, formatDateTime } from "@/lib/utils";
import type {
  Evidence,
  DamageAnalysis,
  SimilarityMatch,
  CurrentUser,
} from "@/types";

function EvidenceInspectionContent({ claimId }: { claimId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Uploading state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // Selected Evidence for Inspection
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("evidenceId") || null);
  const [analysis, setAnalysis] = useState<DamageAnalysis | null>(null);
  const [matches, setMatches] = useState<SimilarityMatch[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("ethioclaim_user");
        if (raw) setCurrentUser(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
    fetchCurrentUser().then(setCurrentUser).catch(() => {});
  }, []);

  const isExaminer = currentUser?.role === "EXAMINER";

  const loadEvidence = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const items = await fetchClaimEvidence(claimId);
      setEvidenceList(items);
      if (!selectedId && items.length > 0) {
        setSelectedId(items[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load evidence");
    } finally {
      setLoading(false);
    }
  }, [claimId, selectedId]);

  useEffect(() => {
    loadEvidence();
  }, [loadEvidence]);

  const inspectEvidence = useCallback(async (evId: string) => {
    setInspectLoading(true);
    try {
      const [a, m] = await Promise.allSettled([
        fetchEvidenceAnalysis(evId),
        fetchEvidenceMatches(evId),
      ]);

      if (a.status === "fulfilled") setAnalysis(a.value);
      else setAnalysis(null);

      if (m.status === "fulfilled") setMatches(m.value);
      else setMatches([]);
    } finally {
      setInspectLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      inspectEvidence(selectedId);
    } else {
      setAnalysis(null);
      setMatches([]);
    }
  }, [selectedId, inspectEvidence]);

  async function handleFiles(files: FileList | null) {
    if (isExaminer) {
      setError("Claims examiners are not permitted to submit claim evidence.");
      return;
    }
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds the maximum allowed size of 10MB`);
        }
        await uploadClaimEvidence(claimId, file, (pct) => setUploadProgress(pct));
      }
      // Section 2: Navigate back to /claims immediately with success indicator
      router.push(`/claims?uploaded=true&claimId=${encodeURIComponent(claimId)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Evidence upload failed");
      setUploading(false);
      setUploadProgress(null);
    }
  }

  async function handleReanalyze() {
    if (!selectedId) return;
    setReanalyzing(true);
    try {
      await reanalyzeEvidence(selectedId);
      setSuccess("Reanalysis requested; refreshing inferences…");
      setTimeout(() => setSuccess(""), 4000);
      await inspectEvidence(selectedId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reanalysis request failed");
    } finally {
      setReanalyzing(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingId) return;
    try {
      await deleteEvidence(deletingId);
      setSuccess("Evidence photo safely removed");
      setTimeout(() => setSuccess(""), 4000);
      setDeletingId(null);
      if (selectedId === deletingId) {
        setSelectedId(null);
      }
      await loadEvidence();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete evidence");
    }
  }

  const selectedEvidence = evidenceList.find((e) => e.id === selectedId);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
        <Link href="/claims" className="hover:text-white transition-colors">
          Claims
        </Link>
        <span className="text-white/20">/</span>
        <Link href={`/claims/${claimId}`} className="hover:text-white transition-colors font-mono">
          {claimId}
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white font-semibold">Evidence & AI Inspection</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] heading-display">
            Evidence Upload & Analysis Inspection
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            {evidenceList.length} photos indexed • SHA-256 duplicate checking • Computer vision damage localization
          </p>
        </div>

        <Link href={`/claims/${claimId}`} className="btn btn-secondary text-xs py-2 px-4">
          ← Back to Claim Summary
        </Link>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-[#30D158]/10 border border-[#30D158]/30 text-xs text-[#30D158] flex items-center gap-2">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="underline ml-3">Dismiss</button>
        </div>
      )}

      {/* Upload Dropzone (Claimant/Intake) or Examiner Review Notice */}
      {!isExaminer ? (
        <div
          id="evidence-upload-zone"
          className={`card apple-glass p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 ${
            dragging ? "border-[#0A84FF] bg-[#0A84FF]/10 ring-4 ring-[#0A84FF]/20" : "hover:border-white/20 hover:bg-white/[0.04]"
          }`}
          style={{ borderStyle: "dashed", borderWidth: "2px" }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => document.getElementById("evidence-file-input")?.click()}
        >
          <input
            id="evidence-file-input"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <svg className="w-9 h-9 animate-spin text-[#0A84FF]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#64D2FF]">
                  Streaming file & computing cryptographic digests…
                </p>
                {uploadProgress !== null && (
                  <p className="text-xs text-[var(--text-muted)] font-mono">{uploadProgress}% transferred</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0A84FF]/10 border border-[#0A84FF]/25 flex items-center justify-center text-[#0A84FF]">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white tracking-tight">
                  Drop vehicle damage photos here, or click to browse
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  JPEG, PNG, WEBP, or HEIC • Max 10MB per photo • Automatically hashed and forwarded for AI analysis
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card apple-glass p-5 border border-[#0A84FF]/30 bg-[#0A84FF]/5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0A84FF]/15 border border-[#0A84FF]/30 text-[#64D2FF] flex items-center justify-center text-lg">
              🛡️
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Examiner Inspection Mode</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Evidence submission is restricted to claimants and intake officers. Review assigned forensic metadata and AI findings below.
              </p>
            </div>
          </div>
          <span className="badge text-[10px] bg-[#0A84FF]/15 text-[#64D2FF] border border-[#0A84FF]/30">
            Assigned Queue
          </span>
        </div>
      )}

      {/* Main Evidence Workspace: Left Thumbnails List, Right Deep Inspection */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="md:col-span-2 skeleton h-80 rounded-2xl" />
        </div>
      ) : evidenceList.length === 0 ? (
        <div className="card apple-glass p-12 text-center text-[var(--text-muted)]">
          <p className="text-sm font-semibold text-white">No Evidence Uploaded</p>
          <p className="text-xs mt-1">
            {isExaminer
              ? "No photos have been uploaded for this assigned claim yet."
              : "Upload vehicle photos above to view forensic hashes, damage detections, and candidate matches."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Thumbnails Sidebar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
              <span className="font-semibold uppercase tracking-wider">Uploaded Photos ({evidenceList.length})</span>
              <span>Click to inspect</span>
            </div>

            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {evidenceList.map((ev) => {
                const isSelected = ev.id === selectedId;
                const fileUrl = getAuthenticatedEvidenceUrl(ev);

                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedId(ev.id)}
                    className={`card p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 border ${
                      isSelected
                        ? "bg-white/[0.08] border-[#0A84FF] ring-2 ring-[#0A84FF]/30 shadow-md"
                        : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20"
                    }`}
                  >
                    <div className="w-16 h-14 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 relative border border-white/5 flex items-center justify-center">
                      <img
                        src={fileUrl}
                        alt={ev.originalFilename || ev.filename || "Evidence"}
                        className="w-full h-full object-cover"
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
                    </div>

                    <div className="flex-1 min-w-0 text-xs space-y-1">
                      <div className="font-semibold text-white truncate font-mono">
                        {ev.originalFilename || ev.filename || `Evidence #${ev.id.slice(-6)}`}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                        {ev.fileSize ? (
                          <span>{Math.round(ev.fileSize / 1024)} KB</span>
                        ) : ev.sizeBytes ? (
                          <span>{Math.round(ev.sizeBytes / 1024)} KB</span>
                        ) : null}
                        <span>•</span>
                        <span>{formatDate(ev.uploadedAt)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {ev.analysisStatus === "PENDING" && (
                          <span className="badge text-[9px] font-semibold bg-[#64D2FF]/15 text-[#64D2FF] border border-[#64D2FF]/30 animate-pulse">
                            AI Processing
                          </span>
                        )}
                        {(ev.hasMatches || (ev as any).matches?.length > 0 || (ev as any).riskLabel === "POTENTIAL_FRAUD") && (
                          <span className="badge text-[9px] font-semibold bg-[#FF453A]/20 text-[#FF6961] border border-[#FF453A]/40">
                            Fraud Review
                          </span>
                        )}
                        {((ev as any).noDamageDetected || (ev.analysisStatus === "COMPLETED" && (ev as any).detections?.length === 0)) && (
                          <span className="badge text-[9px] font-semibold bg-[#FF9F0A]/20 text-[#FFD60A] border border-[#FF9F0A]/40">
                            No Damage
                          </span>
                        )}
                        {ev.analysisStatus === "COMPLETED" && (
                          <span className="badge text-[9px] font-semibold bg-[#30D158]/15 text-[#70E08B] border border-[#30D158]/30">
                            Completed
                          </span>
                        )}
                        {ev.analysisStatus === "FAILED" && (
                          <span className="badge text-[9px] font-semibold bg-[#FF453A]/15 text-[#FF6961] border border-[#FF453A]/30">
                            Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deep Inspection Panel (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {selectedEvidence ? (
              <>
                {/* Image Inspection Card */}
                <div className="card apple-glass p-5 md:p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 flex-wrap gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white font-mono tracking-tight">
                        {selectedEvidence.originalFilename || selectedEvidence.filename || selectedEvidence.id}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Uploaded {formatDateTime(selectedEvidence.uploadedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleReanalyze}
                        disabled={reanalyzing}
                        className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        title="Retry AI Damage Analysis (Section 2.5)"
                      >
                        <svg className={`w-3.5 h-3.5 ${reanalyzing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{reanalyzing ? "Reanalyzing…" : "Reanalyze"}</span>
                      </button>

                      <a
                        href={getEvidenceFileUrl(selectedEvidence.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <span>Full Res</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>

                      {!isExaminer && (
                        <button
                          onClick={() => setDeletingId(selectedEvidence.id)}
                          className="btn btn-secondary text-xs py-1.5 px-2.5 text-[#FF6961] hover:bg-[#FF453A]/10 border-white/10"
                          title="Delete photo safely (Section 2.4)"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* AI Status Banner */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {analysis?.status === "PENDING" && (
                      <span className="badge bg-[#64D2FF]/15 text-[#64D2FF] border border-[#64D2FF]/30 text-xs px-2.5 py-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#64D2FF] inline-block mr-1.5" />
                        AI Processing
                      </span>
                    )}
                    {(matches.length > 0 || analysis?.riskAssessment?.label === "POTENTIAL_FRAUD") && (
                      <span className="badge bg-[#FF453A]/20 text-[#FF6961] border border-[#FF453A]/40 text-xs px-2.5 py-1 font-semibold">
                        ⚠️ Fraud Review Flagged ({matches.length} Matches)
                      </span>
                    )}
                    {analysis?.status === "COMPLETED" && (!analysis?.detections || analysis.detections.length === 0) && (
                      <span className="badge bg-[#FF9F0A]/20 text-[#FFD60A] border border-[#FF9F0A]/40 text-xs px-2.5 py-1 font-semibold">
                        🔍 No Damage Detected (Examiner Cross-Check Required)
                      </span>
                    )}
                    {analysis?.status === "COMPLETED" && analysis?.detections && analysis.detections.length > 0 && (
                      <span className="badge bg-[#30D158]/15 text-[#70E08B] border border-[#30D158]/30 text-xs px-2.5 py-1">
                        ✓ AI Damage Localized ({analysis.detections.length} Parts)
                      </span>
                    )}
                  </div>

                  {/* Main Visual Display */}
                  <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 min-h-[260px] max-h-[480px] flex items-center justify-center p-2">
                    <img
                      src={getAuthenticatedEvidenceUrl(selectedEvidence)}
                      alt={selectedEvidence.originalFilename || selectedEvidence.filename || "Selected Evidence"}
                      className="max-h-[460px] w-auto max-w-full rounded-xl object-contain shadow-2xl"
                      onError={(e) => {
                        const target = e.target as HTMLElement;
                        target.style.display = "none";
                        const fallback = target.parentElement?.querySelector(".main-img-fallback");
                        if (fallback) (fallback as HTMLElement).style.display = "flex";
                      }}
                    />
                    <div className="main-img-fallback hidden flex-col items-center justify-center p-8 text-center text-[var(--text-muted)]">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl mb-2">📷</div>
                      <p className="text-xs font-semibold text-white">Visual Preview Not Available</p>
                      <p className="text-[10px] mt-1 font-mono">{selectedEvidence.originalFilename || selectedEvidence.id}</p>
                    </div>
                  </div>

                  {/* Forensic Hashes Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/[0.02] p-3.5 rounded-xl border border-white/5 font-mono">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                        SHA-256 Digest (Exact Duplicate Check)
                      </span>
                      <span className="text-[#64D2FF] text-[11px] break-all select-all">
                        {selectedEvidence.sha256 || "Digest computed during intake"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                        Perceptual Hash (pHash Near-Duplicate)
                      </span>
                      <span className="text-[#FFD60A] text-[11px] break-all select-all">
                        {selectedEvidence.phash || "Computed on model ingest"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Analysis Findings & Candidate Matches */}
                {inspectLoading ? (
                  <div className="card apple-glass p-8 text-center space-y-3 animate-pulse">
                    <div className="skeleton h-6 w-48 mx-auto rounded" />
                    <div className="skeleton h-24 w-full rounded-xl" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Damage Detections */}
                    <DamageFindings
                      detections={analysis?.detections || []}
                      modelInfo={{
                        modelName: analysis?.modelName,
                        modelVersion: analysis?.modelVersion,
                      }}
                    />

                    {/* Historical Candidate Matches */}
                    <SimilarityResults matches={matches} />
                  </div>
                )}
              </>
            ) : (
              <div className="card apple-glass p-12 text-center text-[var(--text-muted)]">
                Select an evidence photo on the left to inspect its computer vision findings.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Section 2.4: DELETE /evidence/:id) */}
      {deletingId && (
        <div className="modal-overlay" onClick={() => setDeletingId(null)}>
          <div className="card apple-glass p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-[#FF6961]">
              <div className="w-10 h-10 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Delete Evidence Photo?</h3>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to remove this evidence file? This will soft-delete the record and remove it from active candidate matching.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => setDeletingId(null)}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="btn text-xs py-2 px-4 bg-[#FF453A] hover:bg-[#FF453A]/80 text-white font-semibold"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EvidenceInspectionPage({
  params,
}: {
  params: Promise<{ claimId: string }>;
}) {
  const { claimId } = use(params);

  return (
    <Suspense fallback={<div className="skeleton h-96 w-full rounded-2xl" />}>
      <EvidenceInspectionContent claimId={claimId} />
    </Suspense>
  );
}
