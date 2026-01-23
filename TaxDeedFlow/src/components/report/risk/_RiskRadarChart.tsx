"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from "recharts";
import type { RiskWeights } from "@/types/risk-analysis";

interface RiskRadarChartProps {
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
  showLegend: boolean;
  CustomTooltip: React.ComponentType<any>;
}

export function RiskRadarChart({
  chartData,
  height,
  showLegend,
  CustomTooltip,
}: RiskRadarChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="80%">
          <PolarGrid stroke="#94a3b8" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickCount={5}
          />
          <Radar
            name="Risk Score"
            dataKey="score"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value) => (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {value} (0 = minimal risk, 100 = severe risk)
                </span>
              )}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
