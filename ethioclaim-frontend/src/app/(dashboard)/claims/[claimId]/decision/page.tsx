"use client";

import { use } from "react";

export default function DecisionPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = use(params);

  return (
    <div className="space-y-5 animate-fade-in-up max-w-2xl">
      <div>
        <h3 className="text-lg font-bold" style={{ fontFamily: "Space Grotesk" }}>Final Decision</h3>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Record the final claim adjudication decision</p>
      </div>

      <div className="card p-6">
        <div className="rounded-lg p-4 mb-5" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <p className="text-sm" style={{ color: "#fcd34d" }}>
            ⚠️ This decision is final and will be recorded in the audit log. Ensure all evidence has been reviewed.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="decision-outcome">Outcome *</label>
            <select id="decision-outcome" className="select w-full">
              <option value="">Select outcome…</option>
              <option>Approved — Full Payment</option>
              <option>Approved — Partial Payment</option>
              <option>Rejected — Insufficient Evidence</option>
              <option>Rejected — Policy Exclusion</option>
              <option>Referred — Further Investigation</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="decision-amount">Settlement Amount (ETB)</label>
            <input id="decision-amount" type="number" className="input" placeholder="75000" />
          </div>

          <div>
            <label className="label" htmlFor="decision-reason">Decision Rationale *</label>
            <textarea
              id="decision-reason"
              className="input"
              rows={4}
              placeholder="Provide the rationale for this decision, referencing AI findings and examiner review…"
              style={{ resize: "vertical" }}
            />
          </div>

          <div>
            <label className="label" htmlFor="decision-examiner">Adjudicating Examiner</label>
            <input id="decision-examiner" className="input" defaultValue="Dawit Bekele" readOnly />
          </div>

          <div className="flex gap-3 pt-2">
            <button id="decision-save-draft" className="btn btn-secondary">Save Draft</button>
            <button id="decision-submit-final" className="btn btn-primary">
              Submit Final Decision
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
