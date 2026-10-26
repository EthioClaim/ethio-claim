export const dynamic = 'force-dynamic';
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] p-6 relative overflow-hidden">
      {/* Ambient background bloom */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FF9F0A]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="card apple-glass max-w-md w-full p-8 text-center space-y-6 border border-white/10 shadow-2xl relative z-10 animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FF9F0A]/15 border border-[#FF9F0A]/30 flex items-center justify-center text-[#FF9F0A] shadow-lg">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="space-y-2">
          <span className="badge text-[10px] font-mono font-bold text-[#FFD60A] bg-[#FF9F0A]/15 border border-[#FF9F0A]/30 uppercase tracking-wider">
            404 Error • Page Not Found
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight heading-display">
            Claim Record Not Located
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-sm mx-auto">
            The requested claim file, evidence resource, or URL could not be located in the EthioClaim portal.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/claims" className="btn btn-primary text-xs py-2.5 px-5 w-full sm:w-auto font-medium shadow-sm">
            Return to Claims
          </Link>
          <Link href="/dashboard" className="btn btn-secondary text-xs py-2.5 px-5 w-full sm:w-auto font-medium">
            Operations Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
