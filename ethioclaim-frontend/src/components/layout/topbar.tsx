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
      if (pathname.endsWith("/evidence"))      return "Claim Evidence";
      if (pathname.endsWith("/documents"))     return "Documents & OCR";
      if (pathname.endsWith("/ai-analysis"))   return "AI Intelligence Analysis";
      if (pathname.endsWith("/investigation")) return "Fraud Investigation";
      if (pathname.endsWith("/decision"))      return "Claim Decision";
      return "Claim Overview";
    }
    return "EthioClaim";
  })();

  return (
    <header className="topbar apple-chrome">
      {/* Page Title with Optical Typography (Rule 15: Tight tracking -0.025em) */}
      <div className="flex-1 min-w-0">
        <h1 
          className="text-[17px] font-bold text-[var(--text-primary)] truncate tracking-[-0.025em]"
        >
          {title}
        </h1>
      </div>

      {/* Right Actions & Floating Controls */}
      <div className="flex items-center gap-3">
        {/* Spotlight-Style Search Pill */}
        <div className="relative hidden md:block group">
          <svg
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[#0A84FF] transition-colors"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="topbar-search"
            type="text"
            placeholder="Search claims or VIN…"
            className="input pl-9 pr-10 h-9 w-60 focus:w-72 transition-all duration-300 text-xs rounded-full bg-white/[0.06] border-white/10 hover:border-white/20 focus:bg-white/[0.09]"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] bg-white/10 rounded border border-white/10">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Live AI Processing Indicator (Apple Capsule Pill) */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md transition-all"
          style={{ 
            background: "rgba(100, 210, 255, 0.1)", 
            border: "1px solid rgba(100, 210, 255, 0.25)",
            boxShadow: "0 2px 8px rgba(100, 210, 255, 0.1)"
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#64D2FF] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#64D2FF]" />
          </span>
          <span className="text-xs font-semibold tracking-tight text-[#64D2FF]">
            29 AI Jobs Active
          </span>
        </div>

        {/* Notifications Icon Button with Tactile Active Feedback */}
        <button
          id="topbar-notifications"
          className="btn btn-ghost relative p-2 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.08]"
          title="Notifications"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-[var(--bg-base)]"
            style={{ background: "#FF453A" }}
          />
        </button>
      </div>
    </header>
  );
}
