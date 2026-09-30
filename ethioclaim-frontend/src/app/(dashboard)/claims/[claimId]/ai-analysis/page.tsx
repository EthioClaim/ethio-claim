"use client";

import { use, useEffect, useState } from "react";
import { fetchAIAnalysis } from "@/lib/api";
import { RiskScore } from "@/components/ai/risk-score";
import { DamageFindings, ImageQualityResults } from "@/components/ai/damage-findings";
import { SimilarityResults, ConsistencyResults, ExtractedFields } from "@/components/ai/similarity-results";
import type { AIAnalysis } from "@/types";

export default function AIAnalysisPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = use(params);
  const [ai, setAi] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAIAnalysis(claimId).then((a) => { setAi(a); setLoading(false); });
  }, [claimId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
      </div>
    );
  }

  if (!ai) {
    return (
      <div className="card p-10 text-center">
        <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
          style={{ background: "rgba(6,182,212,0.1)" }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#06b6d4">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <p className="font-medium mb-1">No AI Analysis</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Run AI processing from the claim overview to see findings here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Meta bar */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div><span style={{ color: "var(--text-muted)" }}>Model: </span><span className="font-mono">{ai.modelVersion}</span></div>
          <div><span style={{ color: "var(--text-muted)" }}>Processed in: </span><span className="font-medium">{ai.processingTime}s</span></div>
          <div><span style={{ color: "var(--text-muted)" }}>Status: </span><span className="font-medium" style={{ color: "#10b981" }}>{ai.status}</span></div>
          <div><span style={{ color: "var(--text-muted)" }}>Completed: </span><span>{new Date(ai.completedAt ?? "").toLocaleString()}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ImageQualityResults results={ai.imageQualityResults} />
          <DamageFindings findings={ai.damageFindings} />
          <SimilarityResults results={ai.similarityResults} />
          <ConsistencyResults result={ai.consistencyResult} />
          <ExtractedFields extractions={ai.documentExtractions} />
        </div>

        <div className="space-y-4">
          <RiskScore assessment={ai.riskAssessment} />

          <div className="card p-5">
            <h4 className="text-sm font-semibold mb-3">Examiner Decision</h4>
            <div className="space-y-2">
              {[
                { id: "btn-accept",     label: "Accept Findings",          color: "#10b981" },
                { id: "btn-correct",    label: "Correct Findings",          color: "#f59e0b" },
                { id: "btn-request",    label: "Request More Evidence",     color: "#3b82f6" },
                { id: "btn-escalate",   label: "Escalate to Investigation", color: "#ef4444" },
              ].map((action) => (
                <button
                  key={action.id}
                  id={action.id}
                  className="btn w-full justify-start"
                  style={{
                    background: `${action.color}15`,
                    border: `1px solid ${action.color}40`,
                    color: action.color,
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h4 className="text-sm font-semibold mb-3">Add Note</h4>
            <textarea
              id="examiner-note"
              className="input"
              rows={3}
              placeholder="Add examiner notes or corrections…"
              style={{ resize: "vertical" }}
            />
            <button id="save-note-btn" className="btn btn-primary btn-sm mt-3 w-full">Save Note</button>
          </div>
        </div>
      </div>
    </div>
  );
}
