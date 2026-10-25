export const dynamic = 'force-dynamic';
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] p-6">
      <div className="card apple-glass max-w-md w-full p-8 text-center space-y-5 border border-white/10 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FF9F0A]/10 border border-[#FF9F0A]/30 flex items-center justify-center text-[#FF9F0A]">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-mono font-bold text-[#FF9F0A] uppercase tracking-wider">
            404 Error • Page Not Found
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Claim or Resource Does Not Exist
          </h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            The requested resource, claim record, or page could not be located in the EthioClaim portal.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/claims" className="btn btn-primary text-xs py-2 px-4 w-full sm:w-auto">
            Return to Claims List
          </Link>
          <Link href="/dashboard" className="btn btn-secondary text-xs py-2 px-4 w-full sm:w-auto">
            Operations Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
