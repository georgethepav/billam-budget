"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatPence } from "@/lib/money";

const COLOURS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export function CategoryDonut({
  items,
}: {
  items: { category: string; spentPence: number }[];
}) {
  const data = items
    .filter((i) => i.spentPence > 0)
    .map((i) => ({ name: i.category, value: i.spentPence / 100 }));

  const total = data.reduce((a, d) => a + d.value, 0);

  if (data.length === 0) {
    return (
      <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No categorised spend this month yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-56 w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="85%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(v) => `£${Number(v ?? 0).toFixed(2)}`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-1.5 sm:w-1/2">
        {data
          .slice()
          .sort((a, b) => b.value - a.value)
          .map((d) => (
            <li
              key={d.name}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      COLOURS[
                        data.findIndex((x) => x.name === d.name) %
                          COLOURS.length
                      ],
                  }}
                />
                {d.name}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatPence(Math.round(d.value * 100))}
                <span className="ml-1 text-xs">
                  {total > 0 ? `${Math.round((d.value / total) * 100)}%` : ""}
                </span>
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}
