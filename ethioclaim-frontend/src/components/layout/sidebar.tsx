"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NavIcon = ({ path }: { path: string }) => (
  <svg className="w-4 h-4 flex-shrink-0 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const navGroups: NavGroup[] = [
  {
    group: "Workspace",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: <NavIcon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
      },
      {
        href: "/claims",
        label: "All Claims",
        icon: <NavIcon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
        badge: 234,
      },
      {
        href: "/claims/new",
        label: "New Claim",
        icon: <NavIcon path="M12 4v16m8-8H4" />,
      },
    ],
  },
  {
    group: "Intelligence",
    items: [
      {
        href: "/investigations",
        label: "Investigations",
        icon: <NavIcon path="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
        badge: 43,
      },
      {
        href: "/analytics",
        label: "Analytics",
        icon: <NavIcon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        href: "/admin",
        label: "Administration",
        icon: <NavIcon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("ethioclaim_user");
    localStorage.removeItem("ethioclaim_token");
    router.push("/login");
  }

  const user = (() => {
    try {
      if (typeof window !== "undefined") {
        const u = localStorage.getItem("ethioclaim_user");
        return u ? JSON.parse(u) : null;
      }
    } catch { return null; }
    return null;
  })();

  return (
    <aside className="sidebar apple-sidebar">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--border)]">
        <div 
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ 
            background: "linear-gradient(135deg, #0A84FF 0%, #64D2FF 100%)",
            boxShadow: "0 2px 10px rgba(10, 132, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
          }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">
            EthioClaim
          </span>
          <span className="text-[11px] font-medium tracking-normal text-[var(--text-muted)]">
            Intelligence Suite
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-3 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {group.group}
              </span>
            </div>
            {group.items.map((item) => {
              const isActive = 
                pathname === item.href || 
                (item.href !== "/claims/new" && pathname.startsWith(item.href) && item.href !== "/dashboard") ||
                (item.href === "/dashboard" && pathname === "/dashboard");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "sidebar-link group",
                    isActive && "active"
                  )}
                >
                  <span className={cn(
                    "transition-colors duration-200",
                    isActive ? "text-[#64D2FF]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                  )}>
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors"
                      style={{
                        background: isActive ? "rgba(10, 132, 255, 0.25)" : "rgba(255, 255, 255, 0.08)",
                        color: isActive ? "#64D2FF" : "var(--text-secondary)",
                        border: isActive ? "1px solid rgba(10, 132, 255, 0.4)" : "1px solid var(--border)",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Card & Sign Out */}
      <div className="border-t border-[var(--border)] p-3 space-y-2.5 bg-black/10">
        {user ? (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.04] border border-[var(--border)]">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #0A84FF, #BF5AF2)" }}
            >
              {user.name?.charAt(0) ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate text-[var(--text-primary)]">{user.name}</div>
              <div className="text-[10px] truncate text-[var(--text-muted)] capitalize">{user.role}</div>
            </div>
          </div>
        ) : null}

        <button
          onClick={handleLogout}
          className="btn btn-ghost btn-sm w-full justify-start text-[var(--text-muted)] hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors"
          id="sidebar-logout"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium text-xs">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
