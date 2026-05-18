"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export function AppleTimeline({
  data,
}: {
  data: { date: string; amount: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No Apple charges imported yet.
      </p>
    );
  }
  const points = data.map((d) => ({
    x: new Date(d.date).getTime(),
    y: d.amount,
    date: d.date,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            type="number"
            dataKey="x"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("en-GB", {
                month: "short",
                year: "2-digit",
              })
            }
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            tick={{ fontSize: 11 }}
            width={48}
            tickFormatter={(v) => `£${v}`}
          />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(v) => `£${Number(v ?? 0).toFixed(2)}`}
            labelFormatter={(_, p) =>
              p && p[0] ? (p[0].payload as { date: string }).date : ""
            }
          />
          <Scatter
            data={points}
            fill="currentColor"
            className="text-primary"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
