"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { fetchEvidence, uploadEvidence } from "@/lib/api";
import { getQualityColor } from "@/lib/utils";
import type { Evidence } from "@/types";

export default function EvidencePage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = use(params);
  const [evidence, setEvidence]   = useState<Evidence[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected]   = useState<Evidence | null>(null);
  const [dragging, setDragging]   = useState(false);

  useEffect(() => {
    fetchEvidence(claimId).then((e) => { setEvidence(e); setLoading(false); });
  }, [claimId]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await uploadEvidence(claimId, file);
    }
    const updated = await fetchEvidence(claimId);
    setEvidence(updated);
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <h3 className="text-2xl font-extrabold text-white tracking-[-0.03em] heading-display">
            Claim Photographic & Sensor Evidence
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {evidence.length} forensic inspection files uploaded and indexed
          </p>
        </div>
      </div>

      {/* ── Dropzone (Apple Fluid Glass Target) ── */}
      <div
        id="evidence-dropzone"
        className={`card apple-glass p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
          dragging ? "border-[#0A84FF] bg-[#0A84FF]/10 ring-4 ring-[#0A84FF]/20" : "hover:border-white/20 hover:bg-white/[0.04]"
        }`}
        style={{
          borderStyle: "dashed",
          borderWidth: "2px",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files); }}
        onClick={() => document.getElementById("evidence-file-input")?.click()}
      >
        <input
          id="evidence-file-input"
          type="file"
          multiple
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <svg className="w-9 h-9 animate-spin text-[#0A84FF]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm font-semibold text-[#64D2FF]">Uploading & hashing files…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3.5">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
              style={{ background: "rgba(10, 132, 255, 0.12)", border: "1px solid rgba(10, 132, 255, 0.25)" }}
            >
              <svg className="w-7 h-7 text-[#0A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight">Drop vehicle photos here, or click to browse</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                JPG, PNG, HEIC, or scanned PDF documents · Up to 25MB each with EXIF metadata preservation
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Required Evidence Checklist (Apple Inset Grouped) ── */}
      <div className="card apple-glass p-6">
        <h4 className="text-sm font-bold text-white tracking-[-0.015em] mb-3.5">
          Mandatory Inspection Perspectives Checklist
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Front view",      icon: "📸", required: true },
            { label: "Rear view",       icon: "📸", required: true },
            { label: "Left side",       icon: "📸", required: true },
            { label: "Right side",      icon: "📸", required: true },
            { label: "Damage close-up", icon: "📸", required: true },
            { label: "Claim form",      icon: "📄", required: true },
            { label: "Repair estimate",  icon: "📄", required: false },
            { label: "Police report",    icon: "📄", required: false },
          ].map((item) => {
            const uploaded = evidence.some((e) => e.viewType?.toLowerCase().includes(item.label.split(" ")[0].toLowerCase()));
            return (
              <div
                key={item.label}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-colors"
                style={{
                  background: uploaded ? "rgba(48, 209, 88, 0.08)" : "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${uploaded ? "rgba(48, 209, 88, 0.25)" : "var(--border)"}`,
                }}
              >
                <span>{item.icon}</span>
                <span className="text-xs font-medium text-[var(--text-primary)] flex-1 truncate">{item.label}</span>
                {item.required && !uploaded && (
                  <span className="text-[10px] font-semibold text-[#FF9F0A] bg-[#FF9F0A]/10 px-1.5 py-0.5 rounded">Required</span>
                )}
                {uploaded && (
                  <svg className="w-4 h-4 flex-shrink-0 text-[#30D158]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Uploaded Gallery Grid (Apple Continuous Corners & Tactile Hover) ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton rounded-2xl" style={{ aspectRatio: "4/3" }} />)}
        </div>
      ) : evidence.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white tracking-[-0.015em]">
            Uploaded Evidence Repository
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {evidence.map((ev) => (
              <div
                key={ev.id}
                id={`evidence-${ev.id}`}
                className="card apple-glass group cursor-pointer overflow-hidden rounded-2xl relative transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{ aspectRatio: "4/3" }}
                onClick={() => setSelected(ev)}
              >
                {ev.type === "IMAGE" ? (
                  <img
                    src={ev.thumbnailUrl ?? ev.url}
                    alt={ev.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-white/[0.04]">
                    <svg className="w-8 h-8 text-[var(--text-muted)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-mono text-[var(--text-secondary)]">{ev.filename}</span>
                  </div>
                )}

                {/* Translucent Corner Badges */}
                <div className="absolute top-2.5 left-2.5 flex gap-1.5 z-10">
                  {ev.viewType && (
                    <span className="badge text-[10px] font-semibold tracking-wide bg-black/70 text-white backdrop-blur-md border border-white/10 shadow-sm">
                      {ev.viewType}
                    </span>
                  )}
                </div>

                {ev.quality && (
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span
                      className={`badge text-[10px] font-semibold tracking-wide ${getQualityColor(ev.quality)} bg-black/70 backdrop-blur-md border border-white/10 shadow-sm`}
                    >
                      {ev.quality}
                    </span>
                  </div>
                )}

                <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <span className="text-[11px] text-white font-mono truncate block font-medium">{ev.filename}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Lightbox Modal (Apple Fluid Sheet Material) ── */}
      {selected && (
        <div
          className="modal-overlay"
          onClick={() => setSelected(null)}
          id="evidence-lightbox"
        >
          <div 
            className="relative card apple-glass p-3 max-w-4xl max-h-[90vh] overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 btn btn-secondary z-20 p-2 rounded-full"
              onClick={() => setSelected(null)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {selected.type === "IMAGE" && (
              <img
                src={selected.url}
                alt={selected.filename}
                className="max-w-[85vw] max-h-[75vh] rounded-xl object-contain block mx-auto shadow-2xl"
              />
            )}
            <div className="flex items-center justify-between mt-3 px-3">
              <span className="text-xs font-mono font-bold text-white">{selected.filename}</span>
              <div className="flex gap-2">
                {selected.viewType && (
                  <span className="badge" style={{ background: "rgba(10, 132, 255, 0.15)", color: "#64D2FF", border: "1px solid rgba(10, 132, 255, 0.3)" }}>
                    {selected.viewType}
                  </span>
                )}
                {selected.quality && (
                  <span className={`badge ${getQualityColor(selected.quality)} bg-white/10 border border-white/10`}>
                    {selected.quality}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
