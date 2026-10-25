"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredSession, fetchCurrentUser } from "@/lib/api";
import { HeroIcon } from "@/components/ui/HeroIcon";
import type { User } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles?: string[];
}

const navGroups: { group: string; adminOnly?: boolean; items: NavItem[] }[] = [
  {
    group: "Operational Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: <HeroIcon name="home" />,
      },
    ],
  },
  {
    group: "Claims Adjudication",
    items: [
      {
        href: "/claims",
        label: "Claims Management",
        icon: <HeroIcon name="clipboard-list" />,
      },
      {
        href: "/evidence",
        label: "Evidence Inspection",
        allowedRoles: ["EXAMINER", "ADMIN"],
        icon: <HeroIcon name="document-text" />,
      },
      {
        href: "/claims/new",
        label: "New Claim Intake",
        allowedRoles: ["INTAKE_USER", "ADMIN"],
        icon: <HeroIcon name="plus" />,
      },
    ],
  },
  {
    group: "Policy Registry",
    items: [
      {
        href: "/policies/verify",
        label: "Policy Verification",
        icon: <HeroIcon name="shield-check" />,
      },
    ],
  },
  {
    group: "System Administration",
    adminOnly: true,
    items: [
      {
        href: "/admin/users",
        label: "Staff & Users",
        allowedRoles: ["ADMIN"],
        icon: <HeroIcon name="users" />,
      },
      {
        href: "/admin/policies",
        label: "Policy Registry Admin",
        allowedRoles: ["ADMIN"],
        icon: <HeroIcon name="folder" />,
      },
      {
        href: "/admin/audit",
        label: "Audit Logs",
        allowedRoles: ["ADMIN"],
        icon: <HeroIcon name="clipboard" />,
      },
      {
        href: "/admin/operations",
        label: "Analysis Operations",
        allowedRoles: ["ADMIN"],
        icon: <HeroIcon name="cog" />,
      },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ethioclaim_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }

    fetchCurrentUser()
      .then((u) => setUser(u))
      .catch(() => {});
  }, []);

  function handleLogout() {
    clearStoredSession();
    router.push("/login");
  }

  return (
    <aside className={`sidebar apple-sidebar ${isOpen ? "mobile-open" : ""}`}>
      {/* ── Brand Header (Apple Elevated Squircle Logo) ── */}
      <div className="flex items-center gap-3.5 px-6 py-6 border-b border-[var(--border)]">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0A84FF 0%, #0060DF 60%, #64D2FF 100%)",
            boxShadow: "0 2px 10px rgba(10, 132, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
          }}
        >
          <svg className="w-5 h-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[15px] font-bold tracking-tight text-white leading-tight flex items-center gap-1.5">
            EthioClaim
            <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded-md bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/30">
              PRO
            </span>
          </span>
          <span className="text-[11px] text-[var(--text-muted)] tracking-tight leading-none mt-1">
            Claims Intelligence
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="lg:hidden ml-auto p-1.5 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Navigation Groups ── */}
      <nav className="flex-1 px-3.5 py-5 space-y-6 overflow-y-auto">
        {navGroups
          .filter((group) => !group.adminOnly || user?.role === "ADMIN")
          .map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.allowedRoles || (user?.role && item.allowedRoles.includes(user.role))
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group} className="space-y-1">
                <div className="px-3 pb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <span>{group.group}</span>
                  {group.adminOnly && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#BF5AF2]/20 text-[#BF5AF2] border border-[#BF5AF2]/30 font-mono">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/claims" &&
                        item.href !== "/dashboard" &&
                        pathname.startsWith(item.href));

                    let dynamicLabel = item.label;
                    if (item.href === "/claims") {
                      if (user?.role === "EXAMINER") dynamicLabel = "Assigned Queue";
                      else if (user?.role === "INTAKE_USER") dynamicLabel = "My Claims";
                      else if (user?.role === "ADMIN") dynamicLabel = "All Claims (Admin)";
                    } else if (item.href === "/dashboard") {
                      if (user?.role === "EXAMINER") dynamicLabel = "Examiner Workspace";
                      else if (user?.role === "INTAKE_USER") dynamicLabel = "Intake Dashboard";
                      else if (user?.role === "ADMIN") dynamicLabel = "Admin Telemetry";
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onClose?.()}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 select-none ${
                          isActive
                            ? "bg-[#0A84FF] text-white shadow-sm shadow-[#0A84FF]/30 font-semibold"
                            : "text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.06] active:scale-[0.98]"
                        }`}
                      >
                        <span className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-[var(--text-muted)]"}`}>
                          {item.icon}
                        </span>
                        <span className="truncate">{dynamicLabel}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </nav>

      {/* ── User Footer Profile Card ── */}
      <div className="p-3.5 border-t border-[var(--border)]">
        <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/8 backdrop-blur-md flex items-center justify-between gap-2.5 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0A84FF] to-[#64D2FF] text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 shadow-sm">
                {user?.displayName?.[0] || user?.name?.[0] || user?.username?.[0] || "E"}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#30D158] border-2 border-[var(--bg-base)]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate leading-tight">
                {user?.displayName || user?.name || user?.username || "Claims Staff"}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-mono truncate leading-none mt-1">
                {user?.role || "EXAMINER"}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[#FF453A] hover:bg-white/[0.08] active:scale-90 transition-all flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
