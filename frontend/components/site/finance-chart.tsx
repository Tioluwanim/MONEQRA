"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatKobo } from "@/lib/money";
import type { LiquidityPosition } from "@/lib/demo-finance";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type ChartRow = { name: string; kobo: number; fill: string; note: string };

export default function FinanceChart({ position, compact = false }: { position: LiquidityPosition; compact?: boolean }) {
  const reduced = useReducedMotion();
  const rows: ChartRow[] = [
    { name: "Confirmed cash", kobo: position.chart.available, fill: "#0f9d8a", note: "Opening funds + verified settled payments" },
    { name: "Obligation", kobo: position.chart.obligation, fill: "#f06a45", note: "Supplier amount due at 17:00" },
    { name: "Worst case", kobo: position.chart.worstCase, fill: "#8b8f9a", note: "Confirmed cash − obligation, no recovery" },
    { name: "Scenario", kobo: position.chart.scenario, fill: "#5b86ff", note: `Worst case + assumed recovery (${position.recoveryBps / 100}%)` },
  ];

  return (
    <div className={compact ? "h-56 w-full" : "h-72 w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 12, right: 8, bottom: 4, left: -10 }} barCategoryGap="26%">
          <CartesianGrid stroke="rgba(18,32,58,0.09)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: compact ? 9 : 11, fill: "#5e6677", fontFamily: "var(--font-urbanist), sans-serif" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(18,32,58,0.15)" }}
            interval={0}
          />
          <YAxis
            tickFormatter={(value: number) => `${Math.round(value / 100000)}k`}
            tick={{ fontSize: 10, fill: "#5e6677", fontFamily: "var(--font-mono), monospace" }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <ReferenceLine y={0} stroke="#8b8f9a" strokeDasharray="3 3" />
          <Tooltip
            cursor={{ fill: "rgba(91,134,255,0.07)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid rgba(18,32,58,0.12)", boxShadow: "0 18px 40px -24px rgba(9,23,48,0.6)", fontSize: 12 }}
            labelStyle={{ fontWeight: 700, marginBottom: 4 }}
            formatter={(value, _name, item) => [formatKobo(Number(value)), String((item?.payload as ChartRow | undefined)?.note ?? "")]}
          />
          <Bar dataKey="kobo" radius={[8, 8, 4, 4]} isAnimationActive={!reduced} animationDuration={700}>
            {rows.map((row) => (
              <Cell key={row.name} fill={row.fill} fillOpacity={row.name === "Scenario" ? 0.95 : 0.82} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
