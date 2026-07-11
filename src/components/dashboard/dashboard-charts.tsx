"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export type DashboardChartData = {
  weeklyMileage: Array<{
    week: string;
    distanceKm: number;
  }>;
  completion: Array<{
    week: string;
    completed: number;
    partial: number;
    missed: number;
    changed: number;
  }>;
  fatiguePain: Array<{
    date: string;
    fatigueScore: number | null;
    painScore: number | null;
  }>;
  nutrition: Array<{
    date: string;
    carbsG: number;
    proteinG: number;
    calories: number;
  }>;
};

type DashboardChartsProps = {
  data: DashboardChartData;
};

function ChartShell({
  children,
  emptyMessage,
  hasData,
  title
}: {
  children: ReactNode;
  emptyMessage: string;
  hasData: boolean;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <h2 className="font-semibold text-foreground">{title}</h2>
      {hasData ? (
        <div className="mt-4 h-72">{children}</div>
      ) : (
        <p className="mt-4 rounded-md border border-line bg-background p-4 text-sm leading-6 text-muted">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

const axisStyle = {
  fontSize: 12,
  fill: "#6b7280"
};

export function DashboardCharts({ data }: DashboardChartsProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <ChartShell
        emptyMessage="目前訓練紀錄不足，新增訓練紀錄後會顯示週跑量趨勢。"
        hasData={data.weeklyMileage.some((item) => item.distanceKm > 0)}
        title="週跑量趨勢"
      >
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data.weeklyMileage}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={axisStyle} />
            <YAxis tick={axisStyle} unit=" km" />
            <Tooltip />
            <Bar dataKey="distanceKm" fill="#2563eb" name="跑量 km" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell
        emptyMessage="目前尚未有可計算完成率的訓練安排。"
        hasData={data.completion.some((item) => item.completed + item.partial + item.missed + item.changed > 0)}
        title="訓練完成狀態"
      >
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data.completion}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={axisStyle} />
            <YAxis allowDecimals={false} tick={axisStyle} />
            <Tooltip />
            <Legend />
            <Bar dataKey="completed" fill="#16a34a" name="已完成" stackId="status" />
            <Bar dataKey="partial" fill="#f59e0b" name="部分完成" stackId="status" />
            <Bar dataKey="missed" fill="#dc2626" name="未完成" stackId="status" />
            <Bar dataKey="changed" fill="#64748b" name="已調整" stackId="status" />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell
        emptyMessage="目前尚未有疲勞或疼痛分數紀錄。"
        hasData={data.fatiguePain.some((item) => item.fatigueScore !== null || item.painScore !== null)}
        title="疲勞與疼痛趨勢"
      >
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={data.fatiguePain}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={axisStyle} />
            <YAxis domain={[0, 10]} tick={axisStyle} />
            <Tooltip />
            <Legend />
            <Line
              connectNulls
              dataKey="fatigueScore"
              name="疲勞"
              stroke="#f59e0b"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              connectNulls
              dataKey="painScore"
              name="疼痛"
              stroke="#dc2626"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell
        emptyMessage="目前飲食紀錄不足，新增飲食紀錄後會顯示補給趨勢。"
        hasData={data.nutrition.some((item) => item.carbsG > 0 || item.proteinG > 0 || item.calories > 0)}
        title="飲食補給概況"
      >
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data.nutrition}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={axisStyle} />
            <YAxis tick={axisStyle} unit=" g" />
            <Tooltip />
            <Legend />
            <Bar dataKey="carbsG" fill="#2563eb" name="碳水 g" stackId="nutrition" />
            <Bar dataKey="proteinG" fill="#16a34a" name="蛋白質 g" stackId="nutrition" />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    </section>
  );
}
