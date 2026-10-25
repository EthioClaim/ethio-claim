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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#0A84FF] uppercase tracking-wider">
              AI Pipeline Operations
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20 font-mono">
              Advisory Model Engine
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
            Analysis Telemetry & Jobs
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Real-time inference queue telemetry, failure diagnostics, perceptual hash matching, and manual retry controls.
          </p>
        </div>

        <button
          onClick={() => loadOperations()}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 self-start sm:self-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card apple-glass p-4 border border-white/10">
          <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Completed</span>
          <div className="text-2xl font-bold text-[#30D158] mt-1 font-mono">
            {statusCounts.COMPLETED || 0}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
            Passed damage & hash checks
          </span>
        </div>

        <div className="card apple-glass p-4 border border-white/10">
          <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Pending Jobs</span>
          <div className="text-2xl font-bold text-[#FF9F0A] mt-1 font-mono">
            {statusCounts.PENDING || 0}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
            Awaiting worker ingestion
          </span>
        </div>

        <div className="card apple-glass p-4 border border-white/10">
          <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Processing</span>
          <div className="text-2xl font-bold text-[#64D2FF] mt-1 font-mono">
            {statusCounts.PROCESSING || 0}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
            Active inferencing
          </span>
        </div>

        <div className="card apple-glass p-4 border border-white/10">
          <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Failed Analyses</span>
          <div className="text-2xl font-bold text-[#FF453A] mt-1 font-mono">
            {statusCounts.FAILED || 0}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
            Eligible for manual retry
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto text-xs font-mono">
        {[
          { label: "All Runs", value: "" },
          { label: "Completed", value: "COMPLETED" },
          { label: "Failed", value: "FAILED" },
          { label: "Pending", value: "PENDING" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              statusFilter === tab.value
                ? "bg-[#0A84FF] text-white"
                : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Telemetry Table */}
      <div className="card apple-glass border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-3 px-4 font-semibold">Evidence File</th>
                <th className="py-3 px-4 font-semibold">Claim Number</th>
                <th className="py-3 px-4 font-semibold">Model / Version</th>
                <th className="py-3 px-4 font-semibold">Latency</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--text-muted)] font-mono">
                    <div className="inline-block w-6 h-6 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading pipeline telemetry...</div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--text-muted)]">
                    No analysis jobs found for the selected status.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isFailed = item.status === "FAILED";
                  const isSuccess = item.status === "COMPLETED";

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-medium text-white max-w-xs truncate">
                        {item.evidence?.originalName || "Uploaded Evidence"}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#64D2FF]">
                        {item.evidence?.claimNumber || "N/A"}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                        {item.modelName ? `${item.modelName} ${item.modelVersion || ""}` : "Default YOLOv8-Dam"}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                        {item.inferenceMs ? `${item.inferenceMs}ms` : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            isSuccess
                              ? "bg-[#30D158]/10 text-[#30D158] border-[#30D158]/25"
                              : isFailed
                              ? "bg-[#FF453A]/10 text-[#FF453A] border-[#FF453A]/25"
                              : "bg-[#FF9F0A]/10 text-[#FF9F0A] border-[#FF9F0A]/25"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
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
                            {retryingId === item.evidenceId ? "Retrying..." : "Retry"}
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
          <div className="p-3.5 border-t border-white/10 flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
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
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 font-mono">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase">SHA-256 Digest</span>
                  <div className="text-white truncate mt-0.5" title={selectedItem.evidence?.sha256}>
                    {selectedItem.evidence?.sha256 || "Pending calculation"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase">Perceptual Hash (pHash)</span>
                  <div className="text-white truncate mt-0.5" title={selectedItem.evidence?.phash}>
                    {selectedItem.evidence?.phash || "Pending calculation"}
                  </div>
                </div>
              </div>

              {selectedItem.errorMessage && (
                <div className="p-3 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/25 text-[#FF6961]">
                  <span className="text-[10px] font-mono uppercase block font-bold">Error Message</span>
                  <p className="mt-0.5">{selectedItem.errorMessage}</p>
                </div>
              )}

              {selectedItem.errorCode && (
                <div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Error Code</span>
                  <div className="font-mono text-xs text-[#FF9F0A] mt-0.5">{selectedItem.errorCode}</div>
                </div>
              )}

              <div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Model Details</span>
                <div className="text-white mt-0.5">
                  Engine: <strong className="font-mono">{selectedItem.modelName || "YOLOv8-Damage-Detector"}</strong> | Version: <strong className="font-mono">{selectedItem.modelVersion || "1.0.0"}</strong> | Latency: <strong className="font-mono">{selectedItem.inferenceMs || 0}ms</strong>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
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
