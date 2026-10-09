"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

export function BalanceChart({
  data,
}: {
  data: { date: string; balance: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        No transactions imported yet.
      </p>
    );
  }
  // Thin the data if there are a lot of points so the chart stays readable.
  // We keep every nth point so the overall shape is preserved.
  const step = data.length > 400 ? Math.ceil(data.length / 400) : 1;
  const thinned = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={thinned} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: string) =>
              new Date(v).toLocaleDateString("en-GB", {
                month: "short",
                year: "2-digit",
              })
            }
            minTickGap={40}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            width={56}
            tickFormatter={(v: number) => `£${v.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            labelFormatter={(label) =>
              new Date(String(label)).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            }
            formatter={(v) => [`£${Number(v ?? 0).toFixed(2)}`, "Balance"]}
          />
          <ReferenceLine
            y={0}
            stroke="currentColor"
            className="text-red-500"
            strokeDasharray="4 4"
            label={{
              value: "Overdraft threshold",
              position: "insideTopRight",
              fontSize: 10,
              fill: "currentColor",
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="currentColor"
            className="text-primary"
            fill="url(#balanceFill)"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
