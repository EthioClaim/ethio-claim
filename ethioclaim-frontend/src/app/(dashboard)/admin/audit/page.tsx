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
  CLAIM_CREATED: { bg: "bg-[#0A84FF]/12", text: "text-[#64D2FF]", border: "border-[#0A84FF]/30" },
  CLAIM_SUBMITTED: { bg: "bg-[#30D158]/12", text: "text-[#30D158]", border: "border-[#30D158]/30" },
  CLAIM_UPDATED: { bg: "bg-[#64D2FF]/12", text: "text-[#64D2FF]", border: "border-[#64D2FF]/30" },
  STATUS_CHANGED: { bg: "bg-[#BF5AF2]/12", text: "text-[#BF5AF2]", border: "border-[#BF5AF2]/30" },
  EXAMINER_ASSIGNED: { bg: "bg-[#FF9F0A]/12", text: "text-[#FF9F0A]", border: "border-[#FF9F0A]/30" },
  ASSESSMENT_CREATED: { bg: "bg-[#30D158]/12", text: "text-[#30D158]", border: "border-[#30D158]/30" },
  DECISION_RECORDED: { bg: "bg-[#FFD60A]/12", text: "text-[#FFD60A]", border: "border-[#FFD60A]/30" },
  CLAIM_CLOSED: { bg: "bg-white/10", text: "text-[var(--text-muted)]", border: "border-white/15" },
  ADMIN_USER_CREATED: { bg: "bg-[#BF5AF2]/15", text: "text-[#BF5AF2]", border: "border-[#BF5AF2]/35" },
  ADMIN_PASSWORD_RESET: { bg: "bg-[#FF453A]/12", text: "text-[#FF6961]", border: "border-[#FF453A]/30" },
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
  const [copiedPayload, setCopiedPayload] = useState(false);

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

  function copyPayload(details: any) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(details, null, 2));
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge text-[10px] font-mono tracking-wider bg-[#BF5AF2]/12 text-[#BF5AF2] border border-[#BF5AF2]/30">
              IMMUTABLE AUDIT TRAIL
            </span>
            <span className="badge text-[10px] font-mono bg-white/[0.04] text-[var(--text-muted)] border border-white/10">
              {total} TOTAL EVENTS
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] heading-display">
            Administrative Audit Log
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Append-only record of system events, claim adjudications, examiner assignments, and administrative staff activity
          </p>
        </div>

        <button
          onClick={() => loadLogs()}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 self-start sm:self-auto"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="card apple-glass p-4 flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 w-full sm:w-auto relative group">
          <input
            type="text"
            placeholder="Search by action, summary, or user email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9 text-xs w-full"
          />
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[#0A84FF] transition-colors pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            className="select text-xs w-full sm:w-auto"
          >
            <option value="">All Event Types</option>
            <option value="CLAIM_CREATED">CLAIM_CREATED</option>
            <option value="CLAIM_SUBMITTED">CLAIM_SUBMITTED</option>
            <option value="CLAIM_UPDATED">CLAIM_UPDATED</option>
            <option value="STATUS_CHANGED">STATUS_CHANGED</option>
            <option value="EXAMINER_ASSIGNED">EXAMINER_ASSIGNED</option>
            <option value="ASSESSMENT_CREATED">ASSESSMENT_CREATED</option>
            <option value="DECISION_RECORDED">DECISION_RECORDED</option>
            <option value="CLAIM_CLOSED">CLAIM_CLOSED</option>
            <option value="ADMIN_USER_CREATED">ADMIN_USER_CREATED</option>
            <option value="ADMIN_PASSWORD_RESET">ADMIN_PASSWORD_RESET</option>
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
      <div className="card apple-glass overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-white/[0.02] text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-3 px-5 font-semibold">Timestamp</th>
                <th className="py-3 px-5 font-semibold">Action</th>
                <th className="py-3 px-5 font-semibold">Actor</th>
                <th className="py-3 px-5 font-semibold">Summary</th>
                <th className="py-3 px-5 font-semibold">Claim Ref</th>
                <th className="py-3 px-5 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-normal text-[var(--text-secondary)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-[var(--text-muted)] font-mono">
                    <div className="inline-block w-6 h-6 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading audit trail…</div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-[var(--text-muted)]">
                    No audit records found matching the active filter.
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
                      <td className="py-3.5 px-5 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">
                            {log.actor?.name || "System"}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            {log.actor?.role || "SYSTEM"} • {log.actor?.email || ""}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-white/90 max-w-xs truncate font-medium">
                        {log.summary || "No summary provided"}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[11px] whitespace-nowrap">
                        {log.claim?.claimNumber ? (
                          <span className="text-[#64D2FF] font-semibold">
                            {log.claim.claimNumber}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
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
          <div className="p-3.5 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
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
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
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
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">Summary</span>
                <p className="text-xs text-white mt-0.5">{selectedLog.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Actor</span>
                  <div className="font-semibold text-white mt-0.5">{selectedLog.actor?.name || "System"}</div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)]">{selectedLog.actor?.email}</div>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Target Claim</span>
                  <div className="font-semibold text-[#64D2FF] mt-0.5 font-mono">
                    {selectedLog.claim?.claimNumber || "N/A"}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                    Audit Payload JSON
                  </span>
                  <button
                    onClick={() => copyPayload(selectedLog.details)}
                    className="text-[10px] font-mono text-[#64D2FF] hover:underline"
                  >
                    {copiedPayload ? "✓ Copied" : "Copy JSON"}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-[#64D2FF] overflow-x-auto max-h-60 leading-relaxed select-all">
                  {JSON.stringify(selectedLog.details, null, 2) || "{\n  \"info\": \"No additional metadata payload\"\n}"}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-[var(--border)]">
              <button
                onClick={() => setSelectedLog(null)}
                className="btn btn-primary text-xs py-1.5 px-4 font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
