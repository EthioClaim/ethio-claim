"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredSession, fetchCurrentUser } from "@/lib/api";
import type { User } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NavIcon = ({ path }: { path: string }) => (
  <svg className="w-4 h-4 flex-shrink-0 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const navItems: { group: string; adminOnly?: boolean; items: NavItem[] }[] = [
  {
    group: "Operational Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard Summary",
        icon: (
          <NavIcon path="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM14 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
        ),
      },
    ],
  },
  {
    group: "Claims Adjudication",
    items: [
      {
        href: "/claims",
        label: "All Claims",
        icon: (
          <NavIcon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        ),
      },
      {
        href: "/claims/new",
        label: "New Claim Intake",
        icon: <NavIcon path="M12 4v16m8-8H4" />,
      },
    ],
  },
  {
    group: "Policy Registry",
    items: [
      {
        href: "/policies/verify",
        label: "Policy Verification",
        icon: (
          <NavIcon path="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        ),
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
        icon: (
          <NavIcon path="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        ),
      },
      {
        href: "/admin/policies",
        label: "Policy Registry Admin",
        icon: (
          <NavIcon path="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Try localStorage first
    try {
      const stored = localStorage.getItem("ethioclaim_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }

    // Verify with backend
    fetchCurrentUser()
      .then((u) => setUser(u))
      .catch(() => {
        // use stored or default
      });
  }, []);

  function handleLogout() {
    clearStoredSession();
    router.push("/login");
  }

  return (
    <aside className="sidebar apple-sidebar">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--border)]">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background: "linear-gradient(135deg, #0A84FF, #64D2FF)" }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold tracking-tight text-white font-mono leading-tight">
            EthioClaim
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono leading-none mt-0.5">
            Claims Portal
          </span>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {navItems.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>{group.group}</span>
              {group.adminOnly && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#BF5AF2]/20 text-[#BF5AF2] border border-[#BF5AF2]/30 font-mono">
                  ADMIN
                </span>
              )}
            </div>
            <div className="space-y-1 pt-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/claims" &&
                    item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#0A84FF] text-white shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#0A84FF]/20 border border-[#0A84FF]/40 text-[#64D2FF] flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
              {user?.displayName?.[0] || user?.name?.[0] || user?.username?.[0] || "E"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate leading-tight">
                {user?.displayName || user?.name || user?.username || "Claims Staff"}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-mono truncate leading-none mt-0.5">
                {user?.role || "EXAMINER"}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#FF6961] hover:bg-white/10 transition-colors"
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
