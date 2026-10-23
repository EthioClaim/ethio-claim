import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] p-6">
      <div className="card apple-glass max-w-md w-full p-8 text-center space-y-5 border border-white/10 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FF453A]/10 border border-[#FF453A]/30 flex items-center justify-center text-[#FF453A]">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-mono font-bold text-[#FF453A] uppercase tracking-wider">
            403 Forbidden • Access Restricted
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Role Permission Required
          </h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Your current account role does not have authorization to view this administrative resource. Please contact a system administrator if you require elevated privileges.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/claims" className="btn btn-primary text-xs py-2 px-4 w-full sm:w-auto">
            Back to Claims
          </Link>
          <Link href="/login" className="btn btn-secondary text-xs py-2 px-4 w-full sm:w-auto">
            Switch Account
          </Link>
        </div>
      </div>
    </div>
  );
}
