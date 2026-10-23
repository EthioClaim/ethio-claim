"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchClaims,
  fetchCurrentUser,
  fetchEvidenceList,
  getEvidenceFileUrl,
  getAuthenticatedEvidenceUrl,
  fetchEvidenceAnalysis,
  fetchEvidenceMatches,
} from "@/lib/api";
import { DamageFindings } from "@/components/ai/damage-findings";
import { SimilarityResults } from "@/components/ai/similarity-results";
import { formatDate, formatDateTime } from "@/lib/utils";
import type {
  Claim,
  CurrentUser,
  Evidence,
  DamageAnalysis,
  SimilarityMatch,
} from "@/types";

interface FlatEvidenceItem {
  evidence: Evidence;
  claim: Claim;
}

function EvidenceWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [items, setItems] = useState<FlatEvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Deep inspection
  const [selectedItem, setSelectedItem] = useState<FlatEvidenceItem | null>(null);
  const [analysis, setAnalysis] = useState<DamageAnalysis | null>(null);
  const [matches, setMatches] = useState<SimilarityMatch[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("ethioclaim_user");
        if (raw) setCurrentUser(JSON.parse(raw));
      } catch {}
    }
    fetchCurrentUser().then(setCurrentUser).catch(() => {});
  }, []);

  const isExaminer = currentUser?.role === "EXAMINER";

  const loadAllEvidence = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Direct fetch from dedicated /api/v1/evidence endpoint (scoped to assigned claims for examiners)
      const evidenceData = await fetchEvidenceList();

      const flat: FlatEvidenceItem[] = [];
      if (Array.isArray(evidenceData) && evidenceData.length > 0) {
        for (const ev of evidenceData) {
          const claimObj = (ev.claim as Claim) || {
            id: ev.claimId,
            claimNumber: ev.claimId,
            status: "UNDER_REVIEW" as const,
            policy: { policyNumber: "N/A" } as any,
          };
          flat.push({ evidence: ev, claim: claimObj });
        }
      } else {
        // Fallback: Query claims queue and extract evidence
        const claimsRes = await fetchClaims({
          pageSize: 50,
          assignedToMe: isExaminer ? true : undefined,
        });

        for (const claim of claimsRes.items || []) {
          if (claim.evidence && Array.isArray(claim.evidence)) {
            for (const ev of claim.evidence) {
              flat.push({ evidence: ev, claim });
            }
          }
        }
      }

      setItems(flat);
      if (flat.length > 0 && !selectedItem) {
        setSelectedItem(flat[0]);
      }
    } catch (err: unknown) {
      try {
        // Fallback to fetchClaims if /evidence is unavailable
        const claimsRes = await fetchClaims({
          pageSize: 50,
          assignedToMe: isExaminer ? true : undefined,
        });
        const flat: FlatEvidenceItem[] = [];
        for (const claim of claimsRes.items || []) {
          if (claim.evidence && Array.isArray(claim.evidence)) {
            for (const ev of claim.evidence) {
              flat.push({ evidence: ev, claim });
            }
          }
        }
        setItems(flat);
        if (flat.length > 0 && !selectedItem) {
          setSelectedItem(flat[0]);
        }
      } catch (fallbackErr) {
        setError(err instanceof Error ? err.message : "Failed to load evidence records");
      }
    } finally {
      setLoading(false);
    }
  }, [isExaminer, selectedItem]);

  useEffect(() => {
    loadAllEvidence();
  }, [loadAllEvidence]);

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
    if (selectedItem?.evidence.id) {
      inspectEvidence(selectedItem.evidence.id);
    } else {
      setAnalysis(null);
      setMatches([]);
    }
  }, [selectedItem, inspectEvidence]);

  const filteredItems = items.filter(({ evidence, claim }) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQ =
      !q ||
      evidence.originalFilename?.toLowerCase().includes(q) ||
      evidence.filename?.toLowerCase().includes(q) ||
      evidence.id.toLowerCase().includes(q) ||
      claim.claimNumber?.toLowerCase().includes(q) ||
      claim.id.toLowerCase().includes(q);

    const matchesStatus =
      !statusFilter ||
      (statusFilter === "PROCESSING" && evidence.analysisStatus === "PENDING") ||
      (statusFilter === "FRAUD" &&
        (evidence.hasMatches || (evidence as any).matches?.length > 0)) ||
      (statusFilter === "NO_DAMAGE" &&
        ((evidence as any).noDamageDetected ||
          (evidence.analysisStatus === "COMPLETED" &&
            (evidence as any).detections?.length === 0))) ||
      (statusFilter === "COMPLETED" && evidence.analysisStatus === "COMPLETED");

    return matchesQ && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] heading-display">
            {isExaminer ? "Assigned Evidence Inspection" : "Evidence Archives"}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            {isExaminer
              ? "Photographic evidence attached to claims assigned to your review queue"
              : "Repository of uploaded vehicular damage photos and AI forensic analyses"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/claims" className="btn btn-secondary text-xs py-2 px-4">
            ← View Claims Queue
          </Link>
        </div>
      </div>

      {/* Examiner Policy Notice Banner (Section 4: No upload button for examiners) */}
      {isExaminer ? (
        <div className="card apple-glass p-4 border border-[#0A84FF]/25 bg-[#0A84FF]/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0A84FF]/10 text-[#64D2FF] flex items-center justify-center font-bold text-base">
              🛡️
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Examiner Workspace</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Evidence submission is restricted to claimants. Review verified forensic metadata and computer vision findings below.
              </p>
            </div>
          </div>
          <span className="badge text-[10px] bg-[#0A84FF]/15 text-[#64D2FF] border border-[#0A84FF]/30">
            Assigned Claims Only
          </span>
        </div>
      ) : (
        <div className="card apple-glass p-4 border border-white/10 bg-white/[0.02] flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            To submit new photographic evidence for an active claim, visit the specific claim and navigate to Evidence Intake.
          </p>
          <Link href="/claims" className="btn btn-primary text-xs py-1.5 px-3">
            Find Claim
          </Link>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card apple-glass p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56 group">
          <svg
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[#0A84FF] transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by photo filename, evidence ID, or claim #…"
            className="input pl-10 h-10 text-xs rounded-xl w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="select h-10 text-xs rounded-xl min-w-44"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All AI States</option>
          <option value="PROCESSING">AI Processing</option>
          <option value="FRAUD">Fraud Review</option>
          <option value="NO_DAMAGE">No Damage Detected</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <button
          onClick={() => loadAllEvidence()}
          disabled={loading}
          className="btn btn-secondary h-10 px-3 text-xs flex items-center gap-1.5 ml-auto"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/30 text-xs text-[#FF6961] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadAllEvidence()} className="underline ml-3">Retry</button>
        </div>
      )}

      {/* Main Grid: Left Thumbnails List, Right Deep Inspection */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="md:col-span-2 skeleton h-80 rounded-2xl" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card apple-glass p-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[var(--text-muted)] text-xl">
            📷
          </div>
          <p className="text-sm font-bold text-white">No Evidence Found</p>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            {isExaminer
              ? "There are currently no photographic evidence records attached to claims assigned to you."
              : "No evidence records match your search criteria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Thumbnails Sidebar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
              <span className="font-semibold uppercase tracking-wider">
                Assigned Photos ({filteredItems.length})
              </span>
              <span>Select to inspect</span>
            </div>

            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredItems.map(({ evidence: ev, claim }) => {
                const isSelected = selectedItem?.evidence.id === ev.id;
                const fileUrl = getAuthenticatedEvidenceUrl(ev);

                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedItem({ evidence: ev, claim })}
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
                          const fallback = target.parentElement?.querySelector(".img-fallback");
                          if (fallback) (fallback as HTMLElement).style.display = "flex";
                        }}
                      />
                      <div className="img-fallback hidden w-full h-full items-center justify-center text-xs text-[var(--text-muted)] bg-white/5">
                        📷
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 text-xs space-y-1">
                      <div className="font-semibold text-white truncate font-mono">
                        {ev.originalFilename || ev.filename || `Evidence #${ev.id.slice(-6)}`}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                        <Link
                          href={`/claims/${claim.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[#64D2FF] hover:underline"
                        >
                          Claim #{claim.claimNumber || claim.id.slice(0, 8)}
                        </Link>
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deep Inspection Panel */}
          <div className="lg:col-span-2 space-y-6">
            {selectedItem ? (
              <>
                <div className="card apple-glass p-5 md:p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 flex-wrap gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white font-mono tracking-tight">
                        {selectedItem.evidence.originalFilename || selectedItem.evidence.filename || selectedItem.evidence.id}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--text-muted)]">
                        <span>Uploaded {formatDateTime(selectedItem.evidence.uploadedAt)}</span>
                        <span>•</span>
                        <Link
                          href={`/claims/${selectedItem.claim.id}`}
                          className="font-mono text-[#64D2FF] hover:underline"
                        >
                          Claim #{selectedItem.claim.claimNumber || selectedItem.claim.id}
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/claims/${selectedItem.claim.id}`}
                        className="btn btn-secondary text-xs py-1.5 px-3"
                      >
                        Open Claim
                      </Link>
                      <a
                        href={getEvidenceFileUrl(selectedItem.evidence.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <span>Full Res</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
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
                      src={getAuthenticatedEvidenceUrl(selectedItem.evidence)}
                      alt={selectedItem.evidence.originalFilename || selectedItem.evidence.filename || "Selected Evidence"}
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
                      <p className="text-[10px] mt-1 font-mono">{selectedItem.evidence.originalFilename || selectedItem.evidence.id}</p>
                    </div>
                  </div>

                  {/* Forensic Hashes Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/[0.02] p-3.5 rounded-xl border border-white/5 font-mono">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                        SHA-256 Digest (Exact Duplicate Check)
                      </span>
                      <span className="text-[#64D2FF] text-[11px] break-all select-all">
                        {selectedItem.evidence.sha256 || "Digest computed during intake"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                        Perceptual Hash (pHash Near-Duplicate)
                      </span>
                      <span className="text-[#FFD60A] text-[11px] break-all select-all">
                        {selectedItem.evidence.phash || "Computed on model ingest"}
                      </span>
                    </div>
                  </div>
                </div>

                {inspectLoading ? (
                  <div className="card apple-glass p-8 text-center space-y-3 animate-pulse">
                    <div className="skeleton h-6 w-48 mx-auto rounded" />
                    <div className="skeleton h-24 w-full rounded-xl" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <DamageFindings
                      detections={analysis?.detections || []}
                      modelInfo={{
                        modelName: analysis?.modelName,
                        modelVersion: analysis?.modelVersion,
                      }}
                    />
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
    </div>
  );
}

export default function EvidencePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="skeleton h-8 w-64 rounded-lg" />
          <div className="skeleton h-24 w-full rounded-2xl" />
          <div className="skeleton h-80 w-full rounded-2xl" />
        </div>
      }
    >
      <EvidenceWorkspaceContent />
    </Suspense>
  );
}
