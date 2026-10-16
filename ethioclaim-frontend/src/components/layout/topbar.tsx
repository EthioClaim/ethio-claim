"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { checkHealth, subscribeToMockFallbackState, isMockFallbackActive } from "@/lib/api";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Claims Operations Dashboard",
  "/claims": "Insurance Claims Management",
  "/claims/new": "New Motor Claim Intake",
  "/policies/verify": "Policy Registry Verification",
  "/admin/users": "Staff & User Management",
  "/admin/policies": "Policy Registry Administration",
};

export default function Topbar() {
  const pathname = usePathname();
  const [apiStatus, setApiStatus] = useState<"ok" | "error" | "checking">("checking");
  const [mockActive, setMockActive] = useState<boolean>(false);

  useEffect(() => {
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

  const title = (() => {
    if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
    if (pathname.startsWith("/claims/")) {
      if (pathname.endsWith("/evidence")) return "Evidence Upload & Inspection";
      return "Claim Adjudication & Assessment";
    }
    return "EthioClaim";
  })();

  return (
    <header className="topbar apple-chrome">
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[17px] font-bold text-[var(--text-primary)] truncate tracking-[-0.025em]">
          {title}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* API Health / Fallback Mode Pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md text-xs font-mono transition-all"
          style={{
            background: mockActive
              ? "rgba(255, 159, 10, 0.15)"
              : apiStatus === "ok"
              ? "rgba(48, 209, 88, 0.1)"
              : "rgba(255, 69, 58, 0.1)",
            border: `1px solid ${
              mockActive
                ? "rgba(255, 159, 10, 0.4)"
                : apiStatus === "ok"
                ? "rgba(48, 209, 88, 0.25)"
                : "rgba(255, 69, 58, 0.25)"
            }`,
          }}
          title={
            mockActive
              ? "Backend is offline or unreachable. Operating in seamless mock fallback mode with local persistence."
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
            className="text-[11px] font-semibold"
            style={{
              color: mockActive
                ? "#FF9F0A"
                : apiStatus === "ok"
                ? "#30D158"
                : "#FF6961",
            }}
          >
            {mockActive
              ? "Mock Fallback (Offline)"
              : apiStatus === "ok"
              ? "Live API Connected"
              : "API Disconnected"}
          </span>
        </div>

        {/* Quick Intake CTA */}
        <Link
          href="/claims/new"
          className="btn btn-primary text-xs py-1.5 px-3 font-semibold shadow-sm flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">New Claim</span>
        </Link>
      </div>
    </header>
  );
}
