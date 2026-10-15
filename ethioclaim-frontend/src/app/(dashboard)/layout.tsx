import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
