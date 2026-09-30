"use client";

import { use } from "react";

export default function InvestigationPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = use(params);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h3 className="text-lg font-bold" style={{ fontFamily: "Space Grotesk" }}>Investigation</h3>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Investigation notes and evidence network</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Investigation notes */}
        <div className="card p-5">
          <h4 className="text-sm font-semibold mb-4">Investigation Notes</h4>
          <div className="space-y-3 mb-4">
            {[
              { author: "Dawit B.", date: "Sep 29, 2026", text: "Opened investigation due to high image similarity score (0.91) with prior claim EC-2025-001891." },
              { author: "Sara T.", date: "Sep 30, 2026", text: "Requested additional supporting documents from claimant. Follow up in 3 days." },
            ].map((note, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <div className="flex justify-between text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                  <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{note.author}</span>
                  <span>{note.date}</span>
                </div>
                <p className="text-sm">{note.text}</p>
              </div>
            ))}
          </div>
          <div>
            <textarea className="input mb-2" rows={3} placeholder="Add investigation note…" id="investigation-note" />
            <button id="save-investigation-note" className="btn btn-primary btn-sm">Save Note</button>
          </div>
        </div>

        {/* Evidence network */}
        <div className="card p-5">
          <h4 className="text-sm font-semibold mb-4">Evidence Links</h4>
          <div className="space-y-3">
            {[
              { type: "Image Similarity",  desc: "front_damage.jpg matches EC-2025-001891 (91%)", severity: "HIGH" },
              { type: "Claimant History",  desc: "2 claims in last 12 months",                    severity: "MEDIUM" },
              { type: "Vehicle History",   desc: "Previous claim on same plate 8 months ago",     severity: "MEDIUM" },
            ].map((link, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <span
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: link.severity === "HIGH" ? "#ef4444" : "#f59e0b" }}
                />
                <div>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-secondary)" }}>{link.type}</div>
                  <div className="text-sm">{link.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decision panel */}
      <div className="card p-5">
        <h4 className="text-sm font-semibold mb-4">Investigation Decision</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: "inv-close-legitimate", label: "Close — Legitimate Claim", color: "#10b981" },
            { id: "inv-close-fraud",      label: "Close — Suspected Fraud",  color: "#ef4444" },
            { id: "inv-escalate",         label: "Escalate to Senior",       color: "#f59e0b" },
          ].map((action) => (
            <button
              key={action.id}
              id={action.id}
              className="btn w-full justify-center"
              style={{ background: `${action.color}15`, border: `1px solid ${action.color}40`, color: action.color }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
