"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import { fetchCurrentUser } from "@/lib/api";
import type { CurrentUser } from "@/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let token: string | null = null;
    let storedUser: CurrentUser | null = null;

    try {
      token = localStorage.getItem("ethioclaim_token");
      const rawUser = localStorage.getItem("ethioclaim_user");
      if (rawUser) storedUser = JSON.parse(rawUser);
    } catch {
      // ignore
    }

    if (!token && !storedUser) {
      router.replace("/login");
      return;
    }

    if (storedUser) {
      setCurrentUser(storedUser);
      checkRoleAccess(storedUser, pathname);
    }

    // Verify token with backend
    fetchCurrentUser()
      .then((user) => {
        setCurrentUser(user as CurrentUser);
        checkRoleAccess(user as CurrentUser, pathname);
      })
      .catch(() => {
        if (storedUser) {
          checkRoleAccess(storedUser, pathname);
        } else {
          router.replace("/login");
        }
      });
  }, [pathname, router]);

  function checkRoleAccess(user: CurrentUser, currentPath: string) {
    // Admin routes protection: /admin/*
    if (currentPath.startsWith("/admin")) {
      if (user.role !== "ADMIN") {
        router.replace("/403");
        return;
      }
    }

    // New Claim Intake protection: Examiner cannot register claims (Doc 2.3 & 2.4)
    if (currentPath === "/claims/new" || currentPath.startsWith("/claims/new/")) {
      if (user.role === "EXAMINER") {
        router.replace("/claims");
        return;
      }
    }

    setAuthorized(true);
  }

  return (
    <div className="relative flex min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[#0A84FF]/30 selection:text-white">
      {/* Apple Subtle Ambient Depth / Specular Glow */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden" 
        aria-hidden="true"
      >
        <div 
          className="absolute -top-[20%] right-[10%] w-[650px] h-[550px] rounded-full opacity-[0.07] blur-[140px]"
          style={{ background: "radial-gradient(circle, #0A84FF 0%, #64D2FF 60%, transparent 100%)" }}
        />
        <div 
          className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[120px]"
          style={{ background: "radial-gradient(circle, #BF5AF2 0%, transparent 80%)" }}
        />
      </div>

      {/* Structural Translucent Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-1 flex-col min-w-0 min-h-screen" style={{ marginLeft: "var(--sidebar-width)" }}>
        <Topbar />
        <main className="flex-1 px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 sm:gap-8 pb-12">
            {authorized ? children : (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#0A84FF] border-t-transparent animate-spin" />
                  <span className="text-xs font-mono text-[var(--text-muted)]">Verifying permissions...</span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

