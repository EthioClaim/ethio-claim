"use client";

import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard":       "Dashboard",
  "/claims":          "All Claims",
  "/claims/new":      "New Claim",
  "/investigations":  "Investigations",
  "/analytics":       "Analytics",
  "/admin":           "Administration",
  "/admin/users":     "User Management",
};

export default function Topbar() {
  const pathname = usePathname();

  const title = (() => {
    if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
    const match = pathname.match(/^\/claims\/([^/]+)/);
    if (match) {
      if (pathname.endsWith("/evidence"))    return "Evidence";
      if (pathname.endsWith("/documents"))   return "Documents";
      if (pathname.endsWith("/ai-analysis")) return "AI Analysis";
      if (pathname.endsWith("/investigation")) return "Investigation";
      if (pathname.endsWith("/decision"))    return "Decision";
      return "Claim Details";
    }
    return "EthioClaim";
  })();

  return (
    <header className="topbar">
      {/* Page title */}
      <div className="flex-1">
        <h1
          className="text-base font-semibold"
          style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--text-primary)" }}
        >
          {title}
        </h1>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <svg
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
            style={{ color: "var(--text-muted)" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="topbar-search"
            type="text"
            placeholder="Search claims…"
            className="input"
            style={{ paddingLeft: "36px", width: "220px", height: "36px", fontSize: "0.8rem" }}
          />
        </div>

        {/* Notifications */}
        <button
          id="topbar-notifications"
          className="btn btn-ghost relative"
          style={{ padding: "8px" }}
          title="Notifications"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "#ef4444" }}
          />
        </button>

        {/* AI Processing indicator */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#06b6d4" }} />
          <span className="text-xs font-medium" style={{ color: "#67e8f9" }}>29 jobs today</span>
        </div>
      </div>
    </header>
  );
}
