"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface InsurancePieChartProps {
  chartData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  CustomTooltip: React.ComponentType<any>;
}

export function InsurancePieChart({
  chartData,
  CustomTooltip,
}: InsurancePieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
