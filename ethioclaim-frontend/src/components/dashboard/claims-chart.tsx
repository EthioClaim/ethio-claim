"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, Sector,
} from "recharts";
import type { ClaimsOverTime, RiskDistribution, RiskLevel } from "@/types";
import { useState } from "react";

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW:      "#10b981",
  MEDIUM:   "#f59e0b",
  HIGH:     "#f97316",
  CRITICAL: "#a855f7",
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="card p-3 text-sm" style={{ minWidth: 120 }}>
      <div className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function ClaimsChart({ data }: { data: ClaimsOverTime[] }) {
  return (
    <div className="card p-6">
      <h3 className="text-base font-semibold mb-1">Claims Volume</h3>
      <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>Submitted vs resolved over 6 months</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="submitted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
            </linearGradient>
            <linearGradient id="resolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            formatter={(v) => <span style={{ color: "var(--text-secondary)" }}>{v}</span>} />
          <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#3b82f6" fill="url(#submitted)" strokeWidth={2} dot={{ fill: "#3b82f6", strokeWidth: 0, r: 3 }} />
          <Area type="monotone" dataKey="resolved"  name="Resolved"  stroke="#10b981" fill="url(#resolved)"  strokeWidth={2} dot={{ fill: "#10b981", strokeWidth: 0, r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RiskDistributionChart({ data }: { data: RiskDistribution[] }) {
  const renderShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, isActive } = props;

    if (isActive) {
      return (
        <g>
          <text x={cx} y={cy - 10} textAnchor="middle" fill="var(--text-primary)" fontSize={18} fontWeight={700}>
            {value}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-muted)" fontSize={11}>
            {payload.riskLevel}
          </text>
          <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
          <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 13} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        </g>
      );
    }

    return (
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    );
  };

  return (
    <div className="card p-6">
      <h3 className="text-base font-semibold mb-1">Risk Distribution</h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Current open claims by AI risk level</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            dataKey="count"
            nameKey="riskLevel"
            shape={renderShape}
          >
            {data.map((entry) => (
              <Cell key={entry.riskLevel} fill={RISK_COLORS[entry.riskLevel]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {data.map((d) => (
          <div key={d.riskLevel} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: RISK_COLORS[d.riskLevel] }} />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{d.riskLevel}</span>
            <span className="text-xs font-semibold ml-auto" style={{ color: "var(--text-primary)" }}>{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
