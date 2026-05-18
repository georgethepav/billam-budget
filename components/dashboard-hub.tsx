"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPence } from "@/lib/money";
import { spendStatus, STATUS_TEXT, type SpendStatus } from "@/lib/status";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const RING_LABEL: Record<SpendStatus, string> = {
  good: "On track",
  warn: "Getting close",
  over: "Over budget",
  danger: "Well over",
};

// Circular weekly-health gauge. Pure SVG so it's crisp on mobile and needs no
// chart lib. Colour comes from the shared spend-status scale.
export function HealthRing({
  spentPence,
  targetPence,
  caption,
}: {
  spentPence: number;
  targetPence: number;
  caption?: string;
}) {
  const status = spendStatus(spentPence, targetPence);
  const ratio = targetPence > 0 ? spentPence / targetPence : spentPence > 0 ? 1 : 0;
  const pct = Math.min(100, Math.round(ratio * 100));

  const size = 132;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(1, ratio) * circ).toFixed(2);

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={STATUS_TEXT[status]}
          role="img"
          aria-label={`This week: ${pct}% of budget used, ${RING_LABEL[status]}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-secondary"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-2xl font-semibold tabular-nums",
              STATUS_TEXT[status]
            )}
          >
            {pct}%
          </span>
          <span className="text-[11px] text-muted-foreground">of budget</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className={cn("text-lg font-semibold", STATUS_TEXT[status])}>
          {RING_LABEL[status]}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatPence(spentPence)} of {formatPence(targetPence)} this week
        </p>
        {caption && (
          <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>
        )}
      </div>
    </div>
  );
}

// A collapsible dashboard section. Header is always a tap target; content
// renders only when open. Server-rendered children keep data on the server.
export function HubCard({
  title,
  description,
  icon,
  badge,
  badgeVariant = "secondary",
  accent = false,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  accent?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card
      className={cn(
        "gap-0 py-0",
        accent && "border-amber-400 dark:border-amber-700"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-heading text-base font-medium">{title}</span>
            {badge != null && badge !== "" && (
              <Badge variant={badgeVariant}>{badge}</Badge>
            )}
          </span>
          {description && (
            <span className="mt-0.5 block text-sm text-muted-foreground">
              {description}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="border-t px-4 py-4">{children}</div>}
    </Card>
  );
}
