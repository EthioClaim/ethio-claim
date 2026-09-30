"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { fetchEvidence, uploadEvidence } from "@/lib/api";
import { getQualityColor } from "@/lib/utils";
import type { Evidence } from "@/types";

export default function EvidencePage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = use(params);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Evidence | null>(null);
  const [dragging, setDragging] = useState(false);

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
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold" style={{ fontFamily: "Space Grotesk" }}>Evidence</h3>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{evidence.length} files uploaded</p>
        </div>
      </div>

      {/* Upload zone */}
      <div
        id="evidence-dropzone"
        className="card"
        style={{
          border: `2px dashed ${dragging ? "#3b82f6" : "var(--border-light)"}`,
          background: dragging ? "rgba(59,130,246,0.05)" : "var(--bg-elevated)",
          transition: "all 0.2s",
          padding: "40px",
          textAlign: "center",
          cursor: "pointer",
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
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24" stroke="#3b82f6">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm" style={{ color: "#93c5fd" }}>Uploading files…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#3b82f6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">Drop files here or click to upload</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Photos (JPG, PNG), documents (PDF) · Max 10MB each
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Required evidence checklist */}
      <div className="card p-5">
        <h4 className="text-sm font-semibold mb-3">Required Evidence Checklist</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Front view",   icon: "📸", required: true },
            { label: "Rear view",    icon: "📸", required: true },
            { label: "Left side",    icon: "📸", required: true },
            { label: "Right side",   icon: "📸", required: true },
            { label: "Damage close-up", icon: "📸", required: true },
            { label: "Claim form",   icon: "📄", required: true },
            { label: "Repair estimate", icon: "📄", required: false },
            { label: "Police report",   icon: "📄", required: false },
          ].map((item) => {
            const uploaded = evidence.some((e) => e.viewType?.toLowerCase().includes(item.label.split(" ")[0].toLowerCase()));
            return (
              <div
                key={item.label}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                style={{
                  background: uploaded ? "rgba(16,185,129,0.08)" : "var(--bg-elevated)",
                  border: `1px solid ${uploaded ? "rgba(16,185,129,0.2)" : "var(--border)"}`,
                }}
              >
                <span>{item.icon}</span>
                <span className="text-sm flex-1">{item.label}</span>
                {item.required && !uploaded && (
                  <span className="text-xs" style={{ color: "#f59e0b" }}>Required</span>
                )}
                {uploaded && (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#10b981">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Evidence grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton rounded-xl" style={{ aspectRatio: "4/3" }} />)}
        </div>
      ) : evidence.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">Uploaded Files</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {evidence.map((ev) => (
              <div
                key={ev.id}
                id={`evidence-${ev.id}`}
                className="card card-hover cursor-pointer overflow-hidden"
                style={{ aspectRatio: "4/3", position: "relative" }}
                onClick={() => setSelected(ev)}
              >
                {ev.type === "IMAGE" ? (
                  <img
                    src={ev.thumbnailUrl ?? ev.url}
                    alt={ev.filename}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: "var(--bg-elevated)" }}>
                    <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="#94a3b8">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-mono">{ev.filename}</span>
                  </div>
                )}
                {/* Overlay badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {ev.viewType && (
                    <span className="badge text-xs" style={{ background: "rgba(0,0,0,0.7)", color: "#fff", backdropFilter: "blur(4px)" }}>
                      {ev.viewType}
                    </span>
                  )}
                </div>
                {ev.quality && (
                  <div className="absolute top-2 right-2">
                    <span
                      className={`badge text-xs ${getQualityColor(ev.quality)}`}
                      style={{
                        background: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      {ev.quality}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
                  style={{ background: "linear-gradient(transparent,rgba(0,0,0,0.7))" }}>
                  <span className="text-xs text-white font-mono truncate block">{ev.filename}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selected && (
        <div
          className="modal-overlay"
          onClick={() => setSelected(null)}
          id="evidence-lightbox"
        >
          <div className="relative" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "85vh" }}>
            <button
              className="absolute top-3 right-3 btn btn-secondary z-10"
              onClick={() => setSelected(null)}
              style={{ padding: "6px" }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {selected.type === "IMAGE" && (
              <img
                src={selected.url}
                alt={selected.filename}
                style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: "12px", display: "block" }}
              />
            )}
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm font-mono text-white">{selected.filename}</span>
              <div className="flex gap-2">
                {selected.viewType && <span className="badge" style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd" }}>{selected.viewType}</span>}
                {selected.quality && (
                  <span className={`badge ${getQualityColor(selected.quality)}`}
                    style={{ background: "rgba(0,0,0,0.4)" }}>
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
