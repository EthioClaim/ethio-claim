"use client";

import { use } from "react";
import Link from "next/link";

export default function DocumentsPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = use(params);

  const docs = [
    { id: "doc-1", name: "Claim Form.pdf",     type: "Insured Claim Intake Form", pages: 4, size: "1.2 MB", status: "VERIFIED" },
    { id: "doc-2", name: "Repair Estimate.pdf", type: "Garage Repair Estimate",   pages: 2, size: "0.8 MB", status: "VERIFIED" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <h3 className="text-2xl font-extrabold text-white tracking-[-0.03em] heading-display">
            Claim Documents & OCR
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Official insurer policy records, police collision reports, and automated text extractions
          </p>
        </div>
        <button id="documents-upload-btn" className="btn btn-primary shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Upload PDF Document</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {docs.map((doc) => (
          <div key={doc.id} className="card apple-glass p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div 
                className="w-11 h-13 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ background: "rgba(10, 132, 255, 0.14)", border: "1px solid rgba(10, 132, 255, 0.3)" }}
              >
                <svg className="w-6 h-6 text-[#0A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate tracking-tight">{doc.name}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{doc.type} · {doc.pages} pages · {doc.size}</div>
              </div>
              <span className="badge" style={{ background: "rgba(48, 209, 88, 0.14)", color: "#30D158", border: "1px solid rgba(48, 209, 88, 0.3)" }}>
                {doc.status}
              </span>
            </div>

            {/* OCR Extracted Entity Fields Preview */}
            <div className="rounded-xl p-3.5 bg-white/[0.03] border border-white/5 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                OCR Extracted Entities
              </div>
              {[
                ["Claim Number",  "EC-2026-000123", 99],
                ["Incident Date", "2026-09-14",     96],
                ["Vehicle Plate", "AA-12345-A",     94],
              ].map(([field, value, conf]) => (
                <div key={String(field)} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-[var(--text-muted)]">{String(field)}</span>
                  <span className="font-mono font-bold text-white">{String(value)}</span>
                  <span className="text-xs font-mono font-semibold text-[#30D158]">{String(conf)}%</span>
                </div>
              ))}
            </div>

            <Link 
              href={`/claims/${claimId}/ai-analysis`} 
              className="btn btn-ghost btn-sm w-full justify-center text-xs font-semibold text-[#0A84FF] hover:text-[#64D2FF] hover:bg-[#0A84FF]/10 transition-colors"
            >
              Inspect full OCR pipeline extraction →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
