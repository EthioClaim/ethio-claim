"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { checkHealth, subscribeToMockFallbackState } from "@/lib/api";

const ROUTE_LABELS: Record<string, { title: string; category: string }> = {
  "/dashboard": { title: "Operations Dashboard", category: "Telemetry & Overview" },
  "/claims": { title: "Claims Management Queue", category: "Adjudication Workflow" },
  "/claims/new": { title: "New Motor Claim Intake", category: "Registration Wizard" },
  "/evidence": { title: "Evidence Inspection Workspace", category: "Visual Forensics" },
  "/policies/verify": { title: "Policy Registry Verification", category: "Verification Engine" },
  "/admin/users": { title: "Staff & User Access Control", category: "Administration" },
  "/admin/policies": { title: "Policy Registry Administration", category: "Administration" },
  "/admin/audit": { title: "System Audit Trail", category: "Security & Governance" },
  "/admin/operations": { title: "Analysis Operations & Telemetry", category: "AI Infrastructure" },
};

interface TopbarProps {
  onToggleMobileNav?: () => void;
}

export default function Topbar({ onToggleMobileNav }: TopbarProps = {}) {
  const pathname = usePathname();
  const [apiStatus, setApiStatus] = useState<"ok" | "error" | "checking">("checking");
  const [mockActive, setMockActive] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ethioclaim_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserRole(parsed.role || null);
      }
    } catch {
      // ignore
    }

    const unsub = subscribeToMockFallbackState((active) => {
      setMockActive(active);
    });

    checkHealth()
      .then((res) => {
        if (res.status === "ok" || res.status) {
          setApiStatus("ok");
        } else {
          setApiStatus("error");
        }
      })
      .catch(() => {
        setApiStatus("error");
      });

    return () => unsub();
  }, [pathname]);

  const routeMeta = (() => {
    if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
    if (pathname.startsWith("/claims/")) {
      if (pathname.endsWith("/evidence")) {
        return { title: "Evidence Inspection & Computer Vision", category: "Damage Analysis" };
      }
      return { title: "Claim Adjudication & Assessment", category: "Examiner Workspace" };
    }
    return { title: "EthioClaim Pro", category: "Claims Intelligence" };
  })();

  const canCreateClaim = userRole === "INTAKE_USER" || userRole === "ADMIN";

  return (
    <header className="topbar apple-chrome px-6 lg:px-8">
      {/* Mobile Menu Toggle */}
      {onToggleMobileNav && (
        <button
          type="button"
          onClick={onToggleMobileNav}
          aria-label="Open navigation drawer"
          className="lg:hidden p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Breadcrumb / Title with Apple Optical Sizing */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] tracking-wide">
          <span>{routeMeta.category}</span>
          <span>/</span>
        </div>
        <h1 className="text-[16px] sm:text-[18px] font-bold text-white truncate tracking-[-0.024em] leading-tight">
          {routeMeta.title}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* API Health / Fallback Mode Pill */}
        <div
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md text-xs font-mono transition-all duration-300"
          style={{
            background: mockActive
              ? "rgba(255, 159, 10, 0.12)"
              : apiStatus === "ok"
              ? "rgba(48, 209, 88, 0.10)"
              : "rgba(255, 69, 58, 0.10)",
            border: `1px solid ${
              mockActive
                ? "rgba(255, 159, 10, 0.35)"
                : apiStatus === "ok"
                ? "rgba(48, 209, 88, 0.28)"
                : "rgba(255, 69, 58, 0.28)"
            }`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          }}
          title={
            mockActive
              ? "Backend is offline or unreachable. Operating in seamless mock fallback mode."
              : apiStatus === "ok"
              ? "Connected to live NestJS backend (/api/v1)"
              : "Backend unreachable"
          }
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                mockActive
                  ? "bg-[#FF9F0A]"
                  : apiStatus === "ok"
                  ? "bg-[#30D158]"
                  : "bg-[#FF453A]"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                mockActive
                  ? "bg-[#FF9F0A]"
                  : apiStatus === "ok"
                  ? "bg-[#30D158]"
                  : "bg-[#FF453A]"
              }`}
            />
          </span>
          <span
            className="text-[11px] font-semibold tracking-tight"
            style={{
              color: mockActive
                ? "#FF9F0A"
                : apiStatus === "ok"
                ? "#30D158"
                : "#FF6961",
            }}
          >
            {mockActive
              ? "Mock Fallback Active"
              : apiStatus === "ok"
              ? "Live API Connected"
              : "API Disconnected"}
          </span>
        </div>

        {/* Quick Intake CTA - only for Intake User and Admin */}
        {canCreateClaim && (
          <Link
            href="/claims/new"
            className="btn btn-primary text-xs py-2 px-3.5 font-semibold shadow-sm flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Claim</span>
          </Link>
        )}
      </div>
    </header>
  );
}
