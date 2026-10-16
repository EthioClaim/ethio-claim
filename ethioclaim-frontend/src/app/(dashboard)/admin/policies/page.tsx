"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAdminPolicies, createAdminPolicy, updateAdminPolicy } from "@/lib/api";
import type { Policy, CreatePolicyPayload, UpdatePolicyPayload } from "@/types";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active", color: "#30D158" },
  { value: "EXPIRED", label: "Expired", color: "#FF453A" },
  { value: "SUSPENDED", label: "Suspended", color: "#FF9F0A" },
];

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePolicyPayload>({
    policyNumber: "",
    status: "ACTIVE",
    validFrom: new Date().toISOString().split("T")[0],
    validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    insurer: "Ethiopian Insurance Corporation",
    holderName: "",
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [editForm, setEditForm] = useState<UpdatePolicyPayload>({
    status: "ACTIVE",
    validFrom: "",
    validTo: "",
    insurer: "",
    holderName: "",
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function notify(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }

  async function loadPolicies() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminPolicies();
      setPolicies(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load policy records";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolicies();
  }, []);

  async function handleCreatePolicy(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.policyNumber) {
      setCreateError("Policy number is required.");
      return;
    }
    setSubmittingCreate(true);
    setCreateError(null);
    try {
      await createAdminPolicy(createForm);
      notify("success", `Policy ${createForm.policyNumber} created successfully`);
      setIsCreateOpen(false);
      setCreateForm({
        policyNumber: "",
        status: "ACTIVE",
        validFrom: new Date().toISOString().split("T")[0],
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        insurer: "Ethiopian Insurance Corporation",
        holderName: "",
      });
      loadPolicies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create policy";
      setCreateError(msg);
    } finally {
      setSubmittingCreate(false);
    }
  }

  function openEditModal(p: Policy) {
    setEditingPolicy(p);
    setEditForm({
      status: p.status || "ACTIVE",
      validFrom: p.validFrom ? p.validFrom.split("T")[0] : "",
      validTo: p.validTo ? p.validTo.split("T")[0] : "",
      insurer: p.insurer || "",
      holderName: p.holderName || "",
    });
    setEditError(null);
  }

  async function handleUpdatePolicy(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPolicy) return;
    setSubmittingEdit(true);
    setEditError(null);
    try {
      await updateAdminPolicy(editingPolicy.id, editForm);
      notify("success", `Policy ${editingPolicy.policyNumber} updated successfully`);
      setEditingPolicy(null);
      loadPolicies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update policy";
      setEditError(msg);
    } finally {
      setSubmittingEdit(false);
    }
  }

  const filteredPolicies = policies.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      p.policyNumber.toLowerCase().includes(q) ||
      (p.holderName && p.holderName.toLowerCase().includes(q)) ||
      (p.insurer && p.insurer.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-lg ${
            notification.type === "success"
              ? "bg-[#30D158]/15 border-[#30D158]/40 text-[#30D158]"
              : "bg-[#FF453A]/15 border-[#FF453A]/40 text-[#FF453A]"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-white/60 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] heading-display">
            Policy Registry Administration
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Maintain authoritative insurer policies, update coverage validity dates, and seed test policies
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/policies/verify"
            className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-[#64D2FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Verify Live Policy</span>
          </Link>
          <button
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="btn btn-primary text-xs py-2 px-4 shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Register New Policy</span>
          </button>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="card apple-glass p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-[var(--text-muted)] pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by policy number, holder name, or insurer..."
              className="input pl-9 text-xs w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-xs w-40"
          >
            <option value="ALL">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadPolicies}
          className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          title="Refresh Policy List"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Policies Table */}
      <div className="card apple-glass overflow-hidden">
        {loading && policies.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
            <span>Loading registered policies from `/api/v1/admin/policies`...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-[#FF453A] space-y-2">
            <p>Error loading policies: {error}</p>
            <button onClick={loadPolicies} className="btn btn-secondary text-xs py-1.5 px-3">
              Retry
            </button>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] space-y-2">
            <svg className="w-10 h-10 mx-auto text-[var(--text-muted)]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-semibold text-white">No policies found</p>
            <p>No insurance policies matched the filter or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Policy Number</th>
                  <th className="px-5 py-3.5">Policyholder</th>
                  <th className="px-5 py-3.5">Insurer</th>
                  <th className="px-5 py-3.5">Validity Window</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-normal text-[var(--text-secondary)]">
                {filteredPolicies.map((p) => {
                  const isActive = p.status === "ACTIVE";
                  const isExpired = p.status === "EXPIRED";

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-white tracking-wide">
                          {p.policyNumber}
                        </div>
                        {p.normalizedPolicyNumber && p.normalizedPolicyNumber !== p.policyNumber && (
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">
                            Norm: {p.normalizedPolicyNumber}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 font-semibold text-white">
                        {p.holderName || "—"}
                      </td>

                      <td className="px-5 py-3.5 text-[var(--text-secondary)]">
                        {p.insurer || "Ethiopian Insurance Corporation"}
                      </td>

                      <td className="px-5 py-3.5 font-mono text-[11px] text-[var(--text-muted)]">
                        {p.validFrom ? new Date(p.validFrom).toLocaleDateString() : "—"}
                        {" → "}
                        {p.validTo ? new Date(p.validTo).toLocaleDateString() : "—"}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                            isActive
                              ? "bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/30"
                              : isExpired
                              ? "bg-[#FF453A]/10 text-[#FF453A] border border-[#FF453A]/30"
                              : "bg-[#FF9F0A]/10 text-[#FF9F0A] border border-[#FF9F0A]/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-[#30D158]" : isExpired ? "bg-[#FF453A]" : "bg-[#FF9F0A]"
                            }`}
                          />
                          {p.status || "ACTIVE"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/claims/new?policyNumber=${encodeURIComponent(p.policyNumber)}`}
                            className="btn btn-secondary text-xs py-1 px-2 text-[#64D2FF] font-semibold"
                            title="File claim using this policy"
                          >
                            Use in Claim
                          </Link>
                          <button
                            onClick={() => openEditModal(p)}
                            className="btn btn-secondary text-xs py-1 px-2.5 font-semibold"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE POLICY MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card apple-glass max-w-md w-full p-6 space-y-4 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-base font-bold text-white">Register Policy Record</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[var(--text-muted)] hover:text-white"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg text-xs bg-[#FF453A]/10 border border-[#FF453A]/30 text-[#FF453A]">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreatePolicy} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Policy Number *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.policyNumber}
                  onChange={(e) => setCreateForm({ ...createForm, policyNumber: e.target.value.toUpperCase() })}
                  placeholder="ETH-POL-2026-9001"
                  className="input w-full text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Policyholder Name
                </label>
                <input
                  type="text"
                  value={createForm.holderName || ""}
                  onChange={(e) => setCreateForm({ ...createForm, holderName: e.target.value })}
                  placeholder="Tadesse Mengistu"
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Underwriting Insurer
                </label>
                <input
                  type="text"
                  value={createForm.insurer || ""}
                  onChange={(e) => setCreateForm({ ...createForm, insurer: e.target.value })}
                  placeholder="Ethiopian Insurance Corporation"
                  className="input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Coverage From
                  </label>
                  <input
                    type="date"
                    value={createForm.validFrom || ""}
                    onChange={(e) => setCreateForm({ ...createForm, validFrom: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Coverage To
                  </label>
                  <input
                    type="date"
                    value={createForm.validTo || ""}
                    onChange={(e) => setCreateForm({ ...createForm, validTo: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Policy Status
                </label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                  className="input w-full text-xs font-mono"
                >
                  <option value="ACTIVE">ACTIVE (Eligible for claim intake)</option>
                  <option value="EXPIRED">EXPIRED (Past coverage date)</option>
                  <option value="SUSPENDED">SUSPENDED (Under review or defaulted)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2"
                >
                  {submittingCreate && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Create Policy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT POLICY MODAL */}
      {editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card apple-glass max-w-md w-full p-6 space-y-4 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-bold text-white">Edit Policy Record</h3>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">{editingPolicy.policyNumber}</p>
              </div>
              <button
                onClick={() => setEditingPolicy(null)}
                className="text-[var(--text-muted)] hover:text-white"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg text-xs bg-[#FF453A]/10 border border-[#FF453A]/30 text-[#FF453A]">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdatePolicy} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Policyholder Name
                </label>
                <input
                  type="text"
                  value={editForm.holderName || ""}
                  onChange={(e) => setEditForm({ ...editForm, holderName: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Underwriting Insurer
                </label>
                <input
                  type="text"
                  value={editForm.insurer || ""}
                  onChange={(e) => setEditForm({ ...editForm, insurer: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Coverage From
                  </label>
                  <input
                    type="date"
                    value={editForm.validFrom || ""}
                    onChange={(e) => setEditForm({ ...editForm, validFrom: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Coverage To
                  </label>
                  <input
                    type="date"
                    value={editForm.validTo || ""}
                    onChange={(e) => setEditForm({ ...editForm, validTo: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Policy Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="input w-full text-xs font-mono"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setEditingPolicy(null)}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2"
                >
                  {submittingEdit && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
