"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, Sector,
} from "recharts";
import type { ClaimsOverTime, RiskDistribution, RiskLevel } from "@/types";

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW:      "#30D158",
  MEDIUM:   "#FF9F0A",
  HIGH:     "#FF453A",
  CRITICAL: "#BF5AF2",
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="apple-glass p-3 rounded-xl text-xs backdrop-blur-xl border border-white/15 shadow-2xl">
      <div className="font-bold mb-2 text-white tracking-tight">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2.5 my-1 text-[var(--text-secondary)]">
          <span className="w-2 h-2 rounded-full shadow-sm" style={{ background: p.color }} />
          <span className="font-medium">{p.name}:</span>
          <span className="font-bold text-white ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function ClaimsChart({ data }: { data: ClaimsOverTime[] }) {
  return (
    <div className="card apple-glass p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-[15px] sm:text-base font-bold text-white tracking-[-0.02em] leading-snug mb-1.5">
          Claims Volume Dynamics
        </h3>
        <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed">
          Submitted vs resolved claims velocity over 6 months
        </p>
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={data} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="appleSubmittedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#0A84FF" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0A84FF" stopOpacity={0.0}   />
            </linearGradient>
            <linearGradient id="appleResolvedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#30D158" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#30D158" stopOpacity={0.0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis 
            dataKey="month" 
            tick={{ fill: "rgba(235, 235, 245, 0.45)", fontSize: 11, fontWeight: 500 }} 
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis 
            tick={{ fill: "rgba(235, 235, 245, 0.45)", fontSize: 11, fontWeight: 500 }} 
            axisLine={false} 
            tickLine={false} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: "12px", paddingTop: "14px" }}
            formatter={(v) => <span className="text-[var(--text-secondary)] font-medium text-xs">{v}</span>} 
          />
          <Area 
            type="monotone" 
            dataKey="submitted" 
            name="Submitted" 
            stroke="#0A84FF" 
            fill="url(#appleSubmittedGrad)" 
            strokeWidth={2.5} 
            dot={{ fill: "#0A84FF", strokeWidth: 0, r: 3.5 }} 
            activeDot={{ r: 5, fill: "#FFFFFF", stroke: "#0A84FF", strokeWidth: 2 }}
          />
          <Area 
            type="monotone" 
            dataKey="resolved"  
            name="Resolved"  
            stroke="#30D158" 
            fill="url(#appleResolvedGrad)"  
            strokeWidth={2.5} 
            dot={{ fill: "#30D158", strokeWidth: 0, r: 3.5 }} 
            activeDot={{ r: 5, fill: "#FFFFFF", stroke: "#30D158", strokeWidth: 2 }}
          />
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
          <text x={cx} y={cy - 8} textAnchor="middle" fill="#FFFFFF" fontSize={20} fontWeight={800} letterSpacing="-0.03em">
            {value}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(235, 235, 245, 0.6)" fontSize={11} fontWeight={600} letterSpacing="0.04em">
            {payload.riskLevel}
          </text>
          <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 5} startAngle={startAngle} endAngle={endAngle} fill={fill} />
          <Sector cx={cx} cy={cy} innerRadius={outerRadius + 9} outerRadius={outerRadius + 12} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        </g>
      );
    }

    return (
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    );
  };

  return (
    <div className="card apple-glass p-5 sm:p-6 flex flex-col justify-between">
      <div className="mb-4">
        <h3 className="text-[15px] sm:text-base font-bold text-white tracking-[-0.02em] leading-snug mb-1.5">
          AI Risk Distribution
        </h3>
        <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed">
          Active triage categorization breakdown
        </p>
      </div>

      <div className="my-2">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={78}
              dataKey="count"
              nameKey="riskLevel"
              shape={renderShape}
              stroke="transparent"
            >
              {data.map((entry) => (
                <Cell key={entry.riskLevel} fill={RISK_COLORS[entry.riskLevel]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--border)]">
        {data.map((d) => (
          <div key={d.riskLevel} className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03]">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: RISK_COLORS[d.riskLevel] }} />
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">{d.riskLevel}</span>
            <span className="text-xs font-bold text-white ml-auto">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
