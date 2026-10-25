"use client";

import { useEffect, useState } from "react";
import { fetchAuditLogs } from "@/lib/api";

interface AuditLogItem {
  id: string;
  action: string;
  summary?: string;
  details?: any;
  createdAt: string;
  actor?: { id: string; name: string; email: string; role: string };
  claim?: { id: string; claimNumber: string };
}

const ACTION_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  CLAIM_CREATED: { bg: "bg-[#0A84FF]/10", text: "text-[#0A84FF]", border: "border-[#0A84FF]/25" },
  CLAIM_SUBMITTED: { bg: "bg-[#30D158]/10", text: "text-[#30D158]", border: "border-[#30D158]/25" },
  CLAIM_UPDATED: { bg: "bg-[#64D2FF]/10", text: "text-[#64D2FF]", border: "border-[#64D2FF]/25" },
  STATUS_CHANGED: { bg: "bg-[#BF5AF2]/10", text: "text-[#BF5AF2]", border: "border-[#BF5AF2]/25" },
  EXAMINER_ASSIGNED: { bg: "bg-[#FF9F0A]/10", text: "text-[#FF9F0A]", border: "border-[#FF9F0A]/25" },
  ASSESSMENT_CREATED: { bg: "bg-[#30D158]/10", text: "text-[#30D158]", border: "border-[#30D158]/25" },
  DECISION_RECORDED: { bg: "bg-[#FFD60A]/10", text: "text-[#FFD60A]", border: "border-[#FFD60A]/25" },
  CLAIM_CLOSED: { bg: "bg-[#8E8E93]/10", text: "text-[#8E8E93]", border: "border-[#8E8E93]/25" },
  ADMIN_USER_CREATED: { bg: "bg-[#BF5AF2]/15", text: "text-[#BF5AF2]", border: "border-[#BF5AF2]/30" },
  ADMIN_PASSWORD_RESET: { bg: "bg-[#FF453A]/10", text: "text-[#FF453A]", border: "border-[#FF453A]/25" },
};

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await fetchAuditLogs({
        page,
        pageSize,
        action: actionFilter || undefined,
        q: searchQuery || undefined,
      });
      setLogs(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadLogs();
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#BF5AF2] uppercase tracking-wider">
              System Audit
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[var(--text-muted)] font-mono">
              Immutable Trail
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
            Administrative Audit Log
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Append-only record of system events, claim adjudications, examiner assignments, and staff activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Total Events: <strong className="text-white">{total}</strong>
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="card apple-glass p-4 border border-white/10 flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 w-full sm:w-auto relative">
          <input
            type="text"
            placeholder="Search by action, summary, or user email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#0A84FF]"
          />
          <svg className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF] w-full sm:w-auto"
          >
            <option value="" className="bg-[#1C1C1E] text-white">All Event Types</option>
            <option value="CLAIM_CREATED" className="bg-[#1C1C1E] text-white">CLAIM_CREATED</option>
            <option value="CLAIM_SUBMITTED" className="bg-[#1C1C1E] text-white">CLAIM_SUBMITTED</option>
            <option value="CLAIM_UPDATED" className="bg-[#1C1C1E] text-white">CLAIM_UPDATED</option>
            <option value="STATUS_CHANGED" className="bg-[#1C1C1E] text-white">STATUS_CHANGED</option>
            <option value="EXAMINER_ASSIGNED" className="bg-[#1C1C1E] text-white">EXAMINER_ASSIGNED</option>
            <option value="ASSESSMENT_CREATED" className="bg-[#1C1C1E] text-white">ASSESSMENT_CREATED</option>
            <option value="DECISION_RECORDED" className="bg-[#1C1C1E] text-white">DECISION_RECORDED</option>
            <option value="CLAIM_CLOSED" className="bg-[#1C1C1E] text-white">CLAIM_CLOSED</option>
            <option value="ADMIN_USER_CREATED" className="bg-[#1C1C1E] text-white">ADMIN_USER_CREATED</option>
            <option value="ADMIN_PASSWORD_RESET" className="bg-[#1C1C1E] text-white">ADMIN_PASSWORD_RESET</option>
          </select>

          <button
            onClick={() => {
              setActionFilter("");
              setSearchQuery("");
              setPage(1);
            }}
            className="btn btn-secondary text-xs py-2 px-3 flex-shrink-0"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card apple-glass border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Actor</th>
                <th className="py-3 px-4 font-semibold">Summary</th>
                <th className="py-3 px-4 font-semibold">Claim Ref</th>
                <th className="py-3 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-mono">
                    <div className="inline-block w-6 h-6 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading audit events...</div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                    No audit records found matching the active filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badge = ACTION_BADGES[log.action] || {
                    bg: "bg-white/5",
                    text: "text-white",
                    border: "border-white/10",
                  };

                  return (
                    <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">
                            {log.actor?.name || "System"}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            {log.actor?.role || "SYSTEM"} ? {log.actor?.email || ""}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-white/90 max-w-xs truncate">
                        {log.summary || "No summary provided"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap">
                        {log.claim?.claimNumber ? (
                          <span className="text-[#64D2FF] font-semibold">
                            {log.claim.claimNumber}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="btn btn-secondary text-[11px] py-1 px-2.5 font-mono"
                        >
                          View Payload
                        </button>
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
              Page {page} of {totalPages} ({total} events)
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

      {/* Payload Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="card apple-glass modal-content max-w-xl w-full p-6 space-y-4 border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#BF5AF2]">
                  {selectedLog.action}
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Summary</span>
                <p className="text-xs text-white mt-0.5">{selectedLog.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">Actor</span>
                  <div className="font-semibold text-white">{selectedLog.actor?.name || "System"}</div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)]">{selectedLog.actor?.email}</div>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">Target Claim</span>
                  <div className="font-semibold text-[#64D2FF]">
                    {selectedLog.claim?.claimNumber || "N/A"}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Audit Details JSON</span>
                <pre className="mt-1 p-3.5 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-[#64D2FF] overflow-x-auto max-h-60 leading-relaxed">
                  {JSON.stringify(selectedLog.details, null, 2) || "{\n  \"info\": \"No additional metadata payload\"\n}"}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="btn btn-primary text-xs py-1.5 px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
