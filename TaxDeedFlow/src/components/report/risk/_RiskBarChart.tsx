"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

interface RiskBarChartProps {
  chartData: Array<{
    category: string;
    score: number;
    weight: number;
    weightedScore: number;
    riskLevel: string;
    dataAvailability: string;
    label: string;
    fullMark: number;
  }>;
  height: number;
  CustomTooltip: React.ComponentType<any>;
  getScoreColor: (score: number) => string;
}

export function RiskBarChart({
  chartData,
  height,
  CustomTooltip,
  getScoreColor,
}: RiskBarChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={[...chartData].sort((a, b) => b.score - a.score)}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={{ stroke: "#94a3b8" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="score"
            name="Risk Score"
            radius={[0, 4, 4, 0]}
            maxBarSize={30}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
