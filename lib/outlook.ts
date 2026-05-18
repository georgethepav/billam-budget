// Pure projection maths, shared by the server (initial render) and the client
// (live what-if as variable budgets / income / planned payments are edited).
// No I/O here.

export type VariableLine = { category: string; monthlyPence: number };

export type OutlookInputs = {
  // Money already saved today.
  startingSavedPence: number;
  // Effective monthly income (historical average, or the user's override).
  monthlyIncomePence: number;
  // Recurring monthly commitments, kept separate so the bar can colour them.
  monthlyFixedPence: number;
  monthlySubscriptionPence: number;
  monthlyBufferPence: number;
  // The variable category budgets - the editable lever.
  variable: VariableLine[];
  // One-off planned payments falling within the projection window (already
  // filtered + summed by the caller).
  plannedTotalPence: number;
  // Ring-fenced Holiday 2026 fund and what's already been spent against it.
  // The projection reserves only the unspent remainder.
  holidayFundPence: number;
  holidaySpentPence: number;
  // Full months left until the goal date.
  monthsRemaining: number;
  // The single savings goal we're aiming at by the goal date.
  goalTargetPence: number;
};

// One coloured slice of the bar. `key` is stable so colours don't shuffle.
export type OutlookSegment = { key: string; label: string; pence: number };

export type OutlookResult = {
  monthlyOutflowPence: number;
  monthlySurplusPence: number;
  projectedSavedPence: number;
  totalSpentPence: number;
  goalTargetPence: number;
  goalMetPence: number;
  goalShortfallPence: number;
  goalReached: boolean;
  // Saved share of the saved+spent bar (0-1), guarded against /0.
  savedFraction: number;
  // Spent broken down for the stacked bar, over the whole period. Ordered.
  segments: OutlookSegment[];
  // Holiday fund breakdown for display.
  holidayFundPence: number;
  holidaySpentPence: number;
  holidayReservePence: number;
};

export function computeOutlook(i: OutlookInputs): OutlookResult {
  const m = i.monthsRemaining;
  const variableMonthly = i.variable.reduce((a, v) => a + v.monthlyPence, 0);
  const monthlyOutflowPence =
    i.monthlyFixedPence +
    i.monthlySubscriptionPence +
    i.monthlyBufferPence +
    variableMonthly;
  const monthlySurplusPence = i.monthlyIncomePence - monthlyOutflowPence;

  // Past holiday spend has already left the account, so only the unspent
  // remainder of the fund is reserved against the forward projection.
  const holidayReservePence = Math.max(
    0,
    Math.round(i.holidayFundPence - i.holidaySpentPence)
  );

  const totalSpentPence = Math.round(
    monthlyOutflowPence * m + i.plannedTotalPence + holidayReservePence
  );
  const projectedSavedPence = Math.round(
    i.startingSavedPence +
      monthlySurplusPence * m -
      i.plannedTotalPence -
      holidayReservePence
  );

  const goalMetPence = Math.max(
    0,
    Math.min(projectedSavedPence, i.goalTargetPence)
  );
  const goalShortfallPence = Math.max(0, i.goalTargetPence - projectedSavedPence);

  const savedForBar = Math.max(0, projectedSavedPence);
  const denom = savedForBar + Math.max(0, totalSpentPence);

  const segments: OutlookSegment[] = [
    { key: "fixed", label: "Fixed costs", pence: Math.round(i.monthlyFixedPence * m) },
    {
      key: "subscriptions",
      label: "Subscriptions",
      pence: Math.round(i.monthlySubscriptionPence * m),
    },
    ...i.variable.map((v) => ({
      key: `var:${v.category}`,
      label: v.category,
      pence: Math.round(v.monthlyPence * m),
    })),
    { key: "buffer", label: "Buffer", pence: Math.round(i.monthlyBufferPence * m) },
    { key: "holiday", label: "Holiday 2026", pence: holidayReservePence },
    { key: "planned", label: "Planned payments", pence: Math.round(i.plannedTotalPence) },
  ].filter((s) => s.pence > 0);

  return {
    monthlyOutflowPence,
    monthlySurplusPence,
    projectedSavedPence,
    totalSpentPence,
    goalTargetPence: i.goalTargetPence,
    goalMetPence,
    goalShortfallPence,
    goalReached: projectedSavedPence >= i.goalTargetPence,
    savedFraction: denom > 0 ? savedForBar / denom : 0,
    segments,
    holidayFundPence: i.holidayFundPence,
    holidaySpentPence: i.holidaySpentPence,
    holidayReservePence,
  };
}
