"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { MOCK_CLAIMS_OVER_TIME, MOCK_RISK_DISTRIBUTION } from "@/lib/mock-data";

const processingTimeData = [
  { category: "Low Risk",      avgDays: 2.1 },
  { category: "Medium Risk",   avgDays: 4.5 },
  { category: "High Risk",     avgDays: 8.2 },
  { category: "Critical",      avgDays: 14.7 },
];

const aiAccuracyData = [
  { month: "Apr", damage: 88, ocr: 91, similarity: 85 },
  { month: "May", damage: 89, ocr: 93, similarity: 87 },
  { month: "Jun", damage: 91, ocr: 94, similarity: 88 },
  { month: "Jul", damage: 90, ocr: 95, similarity: 90 },
  { month: "Aug", damage: 92, ocr: 95, similarity: 91 },
  { month: "Sep", damage: 91, ocr: 96, similarity: 91 },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="card p-3 text-sm">
      <div className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const kpis = [
  { label: "Total Claims (YTD)", value: "1,847", trend: "+12%", positive: true },
  { label: "AI Processed",       value: "1,612", trend: "+28%", positive: true },
  { label: "Avg. Processing",    value: "4.2 days", trend: "-15%", positive: true },
  { label: "Investigation Rate", value: "5.8%",  trend: "-2%",  positive: true },
  { label: "False Positive Rate", value: "3.2%", trend: "-8%",  positive: true },
  { label: "Manual Override",    value: "12%",   trend: "+1%",  positive: false },
];

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: "Space Grotesk" }}>Analytics</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Claims operations and AI performance metrics</p>
        </div>
        <div className="flex gap-2.5">
          <select className="select btn-sm" id="analytics-period" style={{ height: "36px" }}>
            <option>Last 6 months</option>
            <option>Last 3 months</option>
            <option>This year</option>
          </select>
          <button id="analytics-export" className="btn btn-secondary btn-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card apple-glass p-4 sm:p-5 text-center flex flex-col gap-1.5 justify-between">
            <div className="text-xl font-bold leading-tight" style={{ fontFamily: "Space Grotesk" }}>{kpi.value}</div>
            <div className="text-xs text-[var(--text-muted)] leading-snug">{kpi.label}</div>
            <span className="text-xs font-semibold" style={{ color: kpi.positive ? "#10b981" : "#ef4444" }}>
              {kpi.trend}
            </span>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        {/* Claims volume */}
        <div className="card apple-glass p-5 md:p-6">
          <h3 className="text-sm font-semibold mb-1 leading-snug">Claims Volume</h3>
          <p className="text-xs mb-5 text-[var(--text-muted)] leading-relaxed">Monthly submitted vs resolved</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_CLAIMS_OVER_TIME} margin={{ left: -20, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px" }} formatter={(v) => <span style={{ color: "var(--text-secondary)" }}>{v}</span>} />
              <Bar dataKey="submitted" name="Submitted" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="resolved"  name="Resolved"  fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI accuracy */}
        <div className="card apple-glass p-5 md:p-6">
          <h3 className="text-sm font-semibold mb-1 leading-snug">AI Module Accuracy</h3>
          <p className="text-xs mb-5 text-[var(--text-muted)] leading-relaxed">% confidence on reviewed cases</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={aiAccuracyData} margin={{ left: -20, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[80, 100]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px" }} formatter={(v) => <span style={{ color: "var(--text-secondary)" }}>{v}</span>} />
              <Line type="monotone" dataKey="damage"     name="Damage"     stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} />
              <Line type="monotone" dataKey="ocr"        name="OCR"        stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} />
              <Line type="monotone" dataKey="similarity" name="Similarity" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: "#8b5cf6" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        {/* Processing time by risk */}
        <div className="card apple-glass p-5 md:p-6">
          <h3 className="text-sm font-semibold mb-1 leading-snug">Avg Processing Time by Risk Level</h3>
          <p className="text-xs mb-5 text-[var(--text-muted)] leading-relaxed">Days from submission to resolution</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={processingTimeData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="category" type="category" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={85} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgDays" name="Avg Days" fill="#f59e0b" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk distribution bar */}
        <div className="card apple-glass p-5 md:p-6">
          <h3 className="text-sm font-semibold mb-1 leading-snug">Risk Distribution</h3>
          <p className="text-xs mb-5 text-[var(--text-muted)] leading-relaxed">Open claims by AI risk level</p>
          <div className="space-y-4">
            {MOCK_RISK_DISTRIBUTION.map((rd) => {
              const total = MOCK_RISK_DISTRIBUTION.reduce((s, r) => s + r.count, 0);
              const pct = Math.round((rd.count / total) * 100);
              const colorMap: Record<string, string> = { LOW: "#10b981", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#a855f7" };
              const color = colorMap[rd.riskLevel];
              return (
                <div key={rd.riskLevel}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span style={{ color: "var(--text-secondary)" }}>{rd.riskLevel}</span>
                    <span style={{ color }}>
                      {rd.count} <span style={{ color: "var(--text-muted)" }}>({pct}%)</span>
                    </span>
                  </div>
                  <div className="progress-bar" style={{ height: "8px" }}>
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data table */}
      <div className="card">
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold">Monthly Summary Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Submitted</th>
                <th>AI Processed</th>
                <th>Resolved</th>
                <th>Investigations</th>
                <th>Avg Days</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CLAIMS_OVER_TIME.map((row, i) => (
                <tr key={row.month}>
                  <td className="font-medium">{row.month} 2026</td>
                  <td>{row.submitted}</td>
                  <td>{Math.round(row.submitted * 0.87)}</td>
                  <td style={{ color: "#10b981" }}>{row.resolved}</td>
                  <td style={{ color: "#f59e0b" }}>{Math.round(row.submitted * 0.058)}</td>
                  <td>{(3.8 + i * 0.1).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
