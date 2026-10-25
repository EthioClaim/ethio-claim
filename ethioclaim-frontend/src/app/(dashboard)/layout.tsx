"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import {
  fetchCurrentUser,
  clearStoredSession,
  checkHealth,
  isMockFallbackActive,
  setMockFallbackActive,
  subscribeToMockFallbackState,
} from "@/lib/api";
import type { CurrentUser } from "@/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [mockActive, setMockActive] = useState<boolean>(false);
  const [retrying, setRetrying] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const unsub = subscribeToMockFallbackState((active) => {
      setMockActive(active);
    });

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
      .catch((err) => {
        if (err?.response?.status === 401 || err?.message?.includes("401")) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        if (storedUser && isMockFallbackActive()) {
          checkRoleAccess(storedUser, pathname);
        } else {
          clearStoredSession();
          router.replace("/login");
        }
      });

    return () => unsub();
  }, [pathname, router]);

  async function handleRetryConnection() {
    setRetrying(true);
    try {
      await checkHealth();
      await fetchCurrentUser();
      setMockFallbackActive(false);
      window.location.reload();
    } catch {
      // Still offline
    } finally {
      setRetrying(false);
    }
  }

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

      {/* Mobile Drawer Backdrop Scrim */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Structural Translucent Sidebar */}
      <Sidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-1 flex-col min-w-0 min-h-screen" style={{ marginLeft: "var(--sidebar-offset)" }}>
        {mockActive && (
          <div className="sticky top-0 z-40 bg-[#FF9F0A]/15 border-b border-[#FF9F0A]/35 px-4 py-2.5 flex items-center justify-between text-xs text-[#FFD60A] backdrop-blur-md">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#FF9F0A] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium">
                Offline/demo data — backend or database unavailable. Retrying in background...
              </span>
            </div>
            <button
              onClick={handleRetryConnection}
              disabled={retrying}
              className="px-3 py-1 rounded bg-[#FF9F0A]/20 hover:bg-[#FF9F0A]/30 border border-[#FF9F0A]/40 text-[#FFD60A] text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {retrying ? "Retrying..." : "Retry Connection"}
            </button>
          </div>
        )}
        <Topbar onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)} />
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

