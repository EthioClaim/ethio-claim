"use client";

import { useEffect, useState } from "react";
import { fetchAnalysisOperations, reanalyzeEvidence } from "@/lib/api";

interface AnalysisOperationItem {
  id: string;
  evidenceId: string;
  status: string;
  modelName?: string;
  modelVersion?: string;
  inferenceMs?: number;
  errorCode?: string;
  errorMessage?: string;
  retriedAt?: string;
  createdAt: string;
  evidence?: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    publicUrl?: string;
    sha256?: string;
    phash?: string;
    claimId: string;
    claimNumber: string;
    claimStatus: string;
  };
}

export default function AnalysisOperationsPage() {
  const [items, setItems] = useState<AnalysisOperationItem[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<AnalysisOperationItem | null>(null);

  useEffect(() => {
    loadOperations();
  }, [page, statusFilter]);

  async function loadOperations() {
    setLoading(true);
    try {
      const res = await fetchAnalysisOperations({
        page,
        pageSize: 15,
        status: statusFilter || undefined,
      });
      setItems(res.items || []);
      setStatusCounts(res.statusCounts || {});
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch operations", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry(evidenceId: string) {
    setRetryingId(evidenceId);
    try {
      await reanalyzeEvidence(evidenceId);
      await loadOperations();
    } catch (err) {
      console.error("Failed to retry analysis", err);
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge text-[10px] font-mono tracking-wider bg-[#0A84FF]/12 text-[#64D2FF] border border-[#0A84FF]/30">
              AI INFERENCE PIPELINE
            </span>
            <span className="badge text-[10px] font-mono bg-[#30D158]/12 text-[#30D158] border border-[#30D158]/30">
              ADVISORY ONLY
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] heading-display">
            Analysis Telemetry & Jobs
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Real-time inference queue telemetry, failure diagnostics, perceptual hash matching, and manual retry triggers
          </p>
        </div>

        <button
          onClick={() => loadOperations()}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 self-start sm:self-auto"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card apple-glass p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">Completed</span>
            <span className="w-2 h-2 rounded-full bg-[#30D158]" />
          </div>
          <div className="text-3xl font-extrabold text-[#30D158] mt-2 font-mono tracking-tight">
            {statusCounts.COMPLETED || 0}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
            Passed damage & hash checks
          </span>
        </div>

        <div className="card apple-glass p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">Pending Jobs</span>
            <span className="w-2 h-2 rounded-full bg-[#FF9F0A]" />
          </div>
          <div className="text-3xl font-extrabold text-[#FF9F0A] mt-2 font-mono tracking-tight">
            {statusCounts.PENDING || 0}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
            Awaiting worker ingestion
          </span>
        </div>

        <div className="card apple-glass p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">Processing</span>
            <span className="w-2 h-2 rounded-full bg-[#64D2FF] animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold text-[#64D2FF] mt-2 font-mono tracking-tight">
            {statusCounts.PROCESSING || 0}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
            Active inferencing in progress
          </span>
        </div>

        <div className="card apple-glass p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">Failed Analyses</span>
            <span className="w-2 h-2 rounded-full bg-[#FF453A]" />
          </div>
          <div className="text-3xl font-extrabold text-[#FF453A] mt-2 font-mono tracking-tight">
            {statusCounts.FAILED || 0}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
            Eligible for manual retry
          </span>
        </div>
      </div>

      {/* Segmented Filter Control */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] pb-3 overflow-x-auto text-xs font-mono">
        {[
          { label: "All Runs", value: "" },
          { label: "Completed", value: "COMPLETED" },
          { label: "Failed", value: "FAILED" },
          { label: "Pending", value: "PENDING" },
          { label: "Processing", value: "PROCESSING" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              statusFilter === tab.value
                ? "bg-[#0A84FF] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Telemetry Table */}
      <div className="card apple-glass overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-white/[0.02] text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-3 px-5 font-semibold">Evidence File</th>
                <th className="py-3 px-5 font-semibold">Claim Ref</th>
                <th className="py-3 px-5 font-semibold">Model / Version</th>
                <th className="py-3 px-5 font-semibold">Latency</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold">Timestamp</th>
                <th className="py-3 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-normal text-[var(--text-secondary)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[var(--text-muted)] font-mono">
                    <div className="inline-block w-6 h-6 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading pipeline telemetry…</div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[var(--text-muted)]">
                    No analysis jobs found for the selected filter.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isFailed = item.status === "FAILED";
                  const isSuccess = item.status === "COMPLETED";

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-white max-w-xs truncate font-mono">
                        {item.evidence?.originalName || "Uploaded Evidence"}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[11px] text-[#64D2FF]">
                        {item.evidence?.claimNumber || "N/A"}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[11px] text-[var(--text-muted)]">
                        {item.modelName ? `${item.modelName} ${item.modelVersion || ""}` : "Default YOLOv8-Dam"}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[11px] text-[var(--text-muted)]">
                        {item.inferenceMs ? `${item.inferenceMs}ms` : "—"}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            isSuccess
                              ? "bg-[#30D158]/12 text-[#30D158] border-[#30D158]/30"
                              : isFailed
                              ? "bg-[#FF453A]/12 text-[#FF6961] border-[#FF453A]/30"
                              : "bg-[#FF9F0A]/12 text-[#FF9F0A] border-[#FF9F0A]/30"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="btn btn-secondary text-[11px] py-1 px-2.5 font-mono"
                          >
                            Diagnostics
                          </button>
                          <button
                            disabled={retryingId === item.evidenceId}
                            onClick={() => handleRetry(item.evidenceId)}
                            className="btn btn-primary text-[11px] py-1 px-2.5 font-mono"
                          >
                            {retryingId === item.evidenceId ? "Retrying…" : "Retry"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
            <span>
              Page {page} of {totalPages} ({total} jobs)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary text-xs py-1 px-2.5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary text-xs py-1 px-2.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Diagnostics Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="card apple-glass modal-content max-w-xl w-full p-6 space-y-4 border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#0A84FF]">
                  Diagnostics: {selectedItem.evidence?.originalName}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-white/5 border border-white/10 text-[var(--text-muted)]">
                  {selectedItem.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-[var(--text-muted)] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 font-mono">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">SHA-256 Digest</span>
                  <div className="text-white truncate mt-0.5 select-all" title={selectedItem.evidence?.sha256}>
                    {selectedItem.evidence?.sha256 || "Pending calculation"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Perceptual Hash (pHash)</span>
                  <div className="text-white truncate mt-0.5 select-all" title={selectedItem.evidence?.phash}>
                    {selectedItem.evidence?.phash || "Pending calculation"}
                  </div>
                </div>
              </div>

              {selectedItem.errorMessage && (
                <div className="p-3 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/25 text-[#FF6961]">
                  <span className="text-[10px] font-mono uppercase block font-bold">Error Message</span>
                  <p className="mt-0.5 font-mono text-[11px]">{selectedItem.errorMessage}</p>
                </div>
              )}

              {selectedItem.errorCode && (
                <div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Error Code</span>
                  <div className="font-mono text-xs text-[#FF9F0A] mt-0.5">{selectedItem.errorCode}</div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block mb-1">Model Details</span>
                <div className="text-white text-xs">
                  Engine: <strong className="font-mono text-[#64D2FF]">{selectedItem.modelName || "YOLOv8-Damage-Detector"}</strong> | Version: <strong className="font-mono">{selectedItem.modelVersion || "1.0.0"}</strong> | Latency: <strong className="font-mono">{selectedItem.inferenceMs || 0}ms</strong>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border)]">
              <button
                onClick={() => setSelectedItem(null)}
                className="btn btn-secondary text-xs py-1.5 px-4"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleRetry(selectedItem.evidenceId);
                  setSelectedItem(null);
                }}
                className="btn btn-primary text-xs py-1.5 px-4"
              >
                Trigger Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
