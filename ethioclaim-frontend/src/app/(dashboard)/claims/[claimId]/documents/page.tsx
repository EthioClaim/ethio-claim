"use client";

import { use } from "react";
import Link from "next/link";

export default function DocumentsPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = use(params);

  const docs = [
    { id: "doc-1", name: "Claim Form.pdf",     type: "Claim Form",       pages: 4, size: "1.2 MB", status: "PROCESSED" },
    { id: "doc-2", name: "Repair Estimate.pdf", type: "Repair Estimate",  pages: 2, size: "0.8 MB", status: "PROCESSED" },
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold" style={{ fontFamily: "Space Grotesk" }}>Documents</h3>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Uploaded documents and OCR extractions</p>
        </div>
        <button id="documents-upload-btn" className="btn btn-primary">Upload Document</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map((doc) => (
          <div key={doc.id} className="card p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-12 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <svg className="w-5 h-6" fill="none" viewBox="0 0 24 24" stroke="#3b82f6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{doc.name}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{doc.type} · {doc.pages} pages · {doc.size}</div>
              </div>
              <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                {doc.status}
              </span>
            </div>

            {/* OCR extracted fields preview */}
            <div className="rounded-lg p-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                OCR Extracted Fields
              </div>
              {[
                ["Claim Number",    "EC-2026-000123", 99],
                ["Incident Date",   "2026-09-14",     96],
                ["Vehicle Plate",   "AA-12345-A",     94],
              ].map(([field, value, conf]) => (
                <div key={String(field)} className="flex items-center justify-between text-xs py-1">
                  <span style={{ color: "var(--text-muted)" }}>{String(field)}</span>
                  <span className="font-mono font-medium">{String(value)}</span>
                  <span style={{ color: Number(conf) > 90 ? "#10b981" : "#f59e0b" }}>{String(conf)}%</span>
                </div>
              ))}
            </div>

            <Link href={`/claims/${claimId}/ai-analysis`} className="btn btn-ghost btn-sm w-full justify-center mt-3">
              View full AI extraction →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
