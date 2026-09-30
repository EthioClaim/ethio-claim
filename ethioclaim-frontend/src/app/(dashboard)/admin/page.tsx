"use client";

import { useEffect, useState } from "react";
import { fetchOrgUsers } from "@/lib/api";
import type { OrgUser } from "@/types";
import { formatDate } from "@/lib/utils";

const ROLE_BADGE: Record<string, { color: string; bg: string }> = {
  ADMIN:         { color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
  MANAGER:       { color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  EXAMINER:      { color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  INSPECTOR:     { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  INVESTIGATOR:  { color: "#f97316", bg: "rgba(249,115,22,0.1)" },
};

export default function AdminPage() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrgUsers().then((u) => { setUsers(u); setLoading(false); });
  }, []);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: "Space Grotesk" }}>Administration</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Organization settings and user management</p>
        </div>
        <button id="admin-invite-user" className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invite User
        </button>
      </div>

      {/* Org info */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold mb-4">Organization</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Name",      value: "Awash Insurance Co." },
            { label: "Plan",      value: "Enterprise" },
            { label: "API Access",value: "Enabled" },
            { label: "Region",    value: "Ethiopia (NBE compliant)" },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{item.label}</div>
              <div className="text-sm font-medium">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* User stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Users",     value: users.length,                             color: "#3b82f6" },
          { label: "Active",          value: users.filter((u) => u.status === "ACTIVE").length,  color: "#10b981" },
          { label: "Examiners",       value: users.filter((u) => u.role === "EXAMINER").length,  color: "#f59e0b" },
          { label: "Claims Assigned", value: users.reduce((s, u) => s + u.claimsAssigned, 0),    color: "#8b5cf6" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-2xl font-bold mb-1" style={{ color: s.color, fontFamily: "Space Grotesk" }}>{s.value}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* User table */}
      <div className="card">
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold">Users</h3>
          <input id="admin-user-search" type="text" className="input" placeholder="Search users…" style={{ width: "220px", height: "32px", fontSize: "0.8rem" }} />
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Claims Assigned</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const rb = ROLE_BADGE[user.role] ?? { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff" }}
                          >
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{user.name}</div>
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{ background: rb.bg, color: rb.color, border: `1px solid ${rb.color}33` }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: user.status === "ACTIVE" ? "#10b981" : "#64748b" }}
                          />
                          <span className="text-sm" style={{ color: user.status === "ACTIVE" ? "#10b981" : "var(--text-muted)" }}>
                            {user.status}
                          </span>
                        </div>
                      </td>
                      <td className="text-sm font-medium">{user.claimsAssigned}</td>
                      <td className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn btn-ghost btn-sm" id={`admin-edit-${user.id}`}>Edit</button>
                          {user.status === "ACTIVE" ? (
                            <button className="btn btn-ghost btn-sm" id={`admin-deactivate-${user.id}`} style={{ color: "#ef4444" }}>
                              Deactivate
                            </button>
                          ) : (
                            <button className="btn btn-ghost btn-sm" id={`admin-activate-${user.id}`} style={{ color: "#10b981" }}>
                              Activate
                            </button>
                          )}
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

      {/* AI Model config */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold mb-4">AI Model Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Damage Detection Model",   version: "yolo-damage-v1.3.2",       status: "Active" },
            { label: "OCR Engine",               version: "paddleocr-et-v0.8.1",      status: "Active" },
            { label: "Image Embedding Model",    version: "clip-vit-b32-v1.0",        status: "Active" },
            { label: "Risk Scoring Model",       version: "risk-lgbm-v1.2",           status: "Active" },
          ].map((model) => (
            <div key={model.label} className="rounded-lg p-4 flex items-center justify-between"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <div>
                <div className="text-sm font-medium">{model.label}</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{model.version}</div>
              </div>
              <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                {model.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
