"use client";

import { useEffect, useState } from "react";
import { fetchAdminUsers, createAdminUser, updateAdminUser } from "@/lib/api";
import type { AdminUser, UserRole, CreateAdminUserPayload, UpdateAdminUserPayload } from "@/types";

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string }[] = [
  { value: "EXAMINER", label: "Claims Examiner", desc: "Reviews claims, records assessments, adjudicates decisions" },
  { value: "INTAKE_USER", label: "Intake Officer", desc: "Initiates claims, uploads evidence, verifies policies" },
  { value: "ADMIN", label: "System Administrator", desc: "User management, policy registry oversight, system audit" },
  { value: "MANAGER", label: "Claims Manager", desc: "Operational reporting, telemetry, and escalation oversight" },
  { value: "CLAIMANT", label: "External Claimant", desc: "Restricted claimant self-service portal access" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminUserPayload>({
    email: "",
    username: "",
    displayName: "",
    password: "",
    role: "EXAMINER",
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<UpdateAdminUserPayload>({
    email: "",
    displayName: "",
    role: "EXAMINER",
    status: "ACTIVE",
    password: "",
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function notify(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load staff users";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.email || !createForm.password) {
      setCreateError("Email and password are required.");
      return;
    }
    setSubmittingCreate(true);
    setCreateError(null);
    try {
      await createAdminUser({
        ...createForm,
        name: createForm.displayName || createForm.username || createForm.email.split("@")[0],
      });
      notify("success", `User ${createForm.email} created successfully`);
      setIsCreateOpen(false);
      setCreateForm({
        email: "",
        username: "",
        displayName: "",
        password: "",
        role: "EXAMINER",
      });
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      setCreateError(msg);
    } finally {
      setSubmittingCreate(false);
    }
  }

  function openEditModal(u: AdminUser) {
    setEditingUser(u);
    setEditForm({
      email: u.email || "",
      displayName: u.displayName || u.name || u.username || "",
      role: u.role || "EXAMINER",
      status: (u.status as any) || (u.active !== false ? "ACTIVE" : "INACTIVE"),
      password: "",
    });
    setEditError(null);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setSubmittingEdit(true);
    setEditError(null);

    const payload: UpdateAdminUserPayload = {
      name: editForm.displayName,
      email: editForm.email,
      displayName: editForm.displayName,
      role: editForm.role,
      status: editForm.status,
      active: editForm.status === "ACTIVE",
    };
    if (editForm.password && editForm.password.trim().length > 0) {
      payload.password = editForm.password;
    }

    try {
      await updateAdminUser(editingUser.id, payload);
      notify("success", `User ${editingUser.email} updated successfully`);
      setEditingUser(null);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update user";
      setEditError(msg);
    } finally {
      setSubmittingEdit(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const nameStr = (u.displayName || u.name || u.username || "").toLowerCase();
    const matchesSearch =
      !search ||
      u.email.toLowerCase().includes(q) ||
      nameStr.includes(q);
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-xl animate-fade-in ${
            notification.type === "success"
              ? "bg-[#30D158]/15 border-[#30D158]/40 text-[#70E08B]"
              : "bg-[#FF453A]/15 border-[#FF453A]/40 text-[#FF6961]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notification.type === "success" ? "✓" : "⚠️"}</span>
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-white/60 hover:text-white ml-3">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge text-[10px] font-mono tracking-wider bg-[#BF5AF2]/12 text-[#BF5AF2] border border-[#BF5AF2]/30">
              IDENTITY & ACCESS MANAGEMENT
            </span>
            <span className="badge text-[10px] font-mono bg-white/[0.04] text-[var(--text-muted)] border border-white/10">
              RBAC GOVERNED
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] heading-display">
            Staff & User Management
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Manage system accounts, assign RBAC roles (Examiner, Intake, Admin), and monitor active authorization states
          </p>
        </div>
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
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Controls & Search */}
      <div className="card apple-glass p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 group">
            <span className="absolute inset-y-0 left-3 flex items-center text-[var(--text-muted)] group-focus-within:text-[#0A84FF] transition-colors pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or username..."
              className="input pl-9 text-xs w-full"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="select text-xs w-48"
          >
            <option value="ALL">All Roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadUsers}
          className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          title="Refresh User List"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="card apple-glass overflow-hidden shadow-xl">
        {loading && users.length === 0 ? (
          <div className="p-14 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
            <span className="font-mono">Loading staff directory…</span>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-xs text-[#FF6961] space-y-3">
            <p>Error loading staff directory: {error}</p>
            <button onClick={loadUsers} className="btn btn-secondary text-xs py-1.5 px-3 mx-auto">
              Retry Connection
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-14 text-center text-xs text-[var(--text-muted)] space-y-2">
            <svg className="w-10 h-10 mx-auto text-[var(--text-muted)]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="font-semibold text-white">No Users Found</p>
            <p>No user accounts matched the filter or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5">Created Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-normal text-[var(--text-secondary)]">
                {filteredUsers.map((u) => {
                  const roleLabel = ROLE_OPTIONS.find((r) => r.value === u.role)?.label || u.role;
                  const isActive = u.status === "ACTIVE" || u.active === true || (u.active !== false && u.status !== "INACTIVE");

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0A84FF]/15 text-[#64D2FF] font-bold flex items-center justify-center uppercase border border-[#0A84FF]/25 flex-shrink-0">
                            {u.displayName?.[0] || u.name?.[0] || u.username?.[0] || u.email[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">
                              {u.displayName || u.name || u.username || "Staff User"}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                            u.role === "ADMIN"
                              ? "bg-[#BF5AF2]/15 text-[#BF5AF2] border border-[#BF5AF2]/30"
                              : u.role === "EXAMINER"
                              ? "bg-[#0A84FF]/15 text-[#64D2FF] border border-[#0A84FF]/30"
                              : u.role === "INTAKE_USER"
                              ? "bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30"
                              : "bg-white/10 text-white/80 border border-white/20"
                          }`}
                        >
                          {roleLabel}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                            isActive
                              ? "bg-[#30D158]/12 text-[#30D158] border border-[#30D158]/30"
                              : "bg-[#FF453A]/12 text-[#FF6961] border border-[#FF453A]/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-[#30D158]" : "bg-[#FF453A]"
                            }`}
                          />
                          {u.status || (u.active !== false ? "ACTIVE" : "INACTIVE")}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-[11px] text-[var(--text-muted)]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => openEditModal(u)}
                          className="btn btn-secondary text-xs py-1 px-3 font-semibold hover:border-[#0A84FF]/40"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="card apple-glass modal-content max-w-md w-full p-6 space-y-4 border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-bold text-white">Add New Staff Member</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Configure system credentials and access role</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[var(--text-muted)] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl text-xs bg-[#FF453A]/12 border border-[#FF453A]/30 text-[#FF6961]">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="examiner@ethioclaim.et"
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  value={createForm.displayName || ""}
                  onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                  placeholder="Abebe Kebede"
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Username (Optional)
                </label>
                <input
                  type="text"
                  value={createForm.username || ""}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  placeholder="akebede"
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Role Assignment *
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                  className="select w-full text-xs"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {r.desc}
                    </option>
                  ))}
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
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="card apple-glass modal-content max-w-md w-full p-6 space-y-4 border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-bold text-white">Edit Staff User</h3>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-[var(--text-muted)] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl text-xs bg-[#FF453A]/12 border border-[#FF453A]/30 text-[#FF6961]">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  value={editForm.displayName || ""}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Role Assignment
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  className="select w-full text-xs"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Account Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                  className="select w-full text-xs"
                >
                  <option value="ACTIVE">ACTIVE (Authorized to authenticate and perform role tasks)</option>
                  <option value="INACTIVE">INACTIVE (Access revoked / suspended)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Reset Password (leave empty to keep unchanged)
                </label>
                <input
                  type="password"
                  value={editForm.password || ""}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="New password (optional)"
                  className="input w-full text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
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
