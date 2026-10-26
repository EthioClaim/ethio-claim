import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] p-6 relative overflow-hidden">
      {/* Ambient background bloom */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FF453A]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="card apple-glass max-w-md w-full p-8 text-center space-y-6 border border-white/10 shadow-2xl relative z-10 animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FF453A]/15 border border-[#FF453A]/30 flex items-center justify-center text-[#FF453A] shadow-lg">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <div className="space-y-2">
          <span className="badge text-[10px] font-mono font-bold text-[#FF6961] bg-[#FF453A]/15 border border-[#FF453A]/30 uppercase tracking-wider">
            403 Forbidden • Access Restricted
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight heading-display">
            Elevated Role Required
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-sm mx-auto">
            Your current account credentials lack permission to access this administrative resource. Contact your insurer administrator or switch to an authorized staff role.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/claims" className="btn btn-primary text-xs py-2.5 px-5 w-full sm:w-auto font-medium shadow-sm">
            Return to Claims
          </Link>
          <Link href="/login" className="btn btn-secondary text-xs py-2.5 px-5 w-full sm:w-auto font-medium">
            Switch Account
          </Link>
        </div>
      </div>
    </div>
  );
}
