// Pure projection maths, shared by the server (initial render) and the client
// (live what-if as variable budgets / income are edited). No I/O here.

export type OutlookInputs = {
  // Money already saved today.
  startingSavedPence: number;
  // Effective monthly income (historical average, or the user's override).
  monthlyIncomePence: number;
  // Committed monthly spend that isn't being tweaked here: fixed costs,
  // subscriptions and buffer budget targets.
  monthlyFixedPence: number;
  // Sum of the variable category budgets - the editable lever.
  monthlyVariablePence: number;
  // Full months left until the goal date.
  monthsRemaining: number;
  // The single savings goal we're aiming at by the goal date.
  goalTargetPence: number;
};

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
};

export function computeOutlook(i: OutlookInputs): OutlookResult {
  const monthlyOutflowPence = i.monthlyFixedPence + i.monthlyVariablePence;
  const monthlySurplusPence = i.monthlyIncomePence - monthlyOutflowPence;

  const projectedSavedPence = Math.round(
    i.startingSavedPence + monthlySurplusPence * i.monthsRemaining
  );
  const totalSpentPence = Math.round(
    monthlyOutflowPence * i.monthsRemaining
  );

  const goalMetPence = Math.max(
    0,
    Math.min(projectedSavedPence, i.goalTargetPence)
  );
  const goalShortfallPence = Math.max(0, i.goalTargetPence - projectedSavedPence);

  const savedForBar = Math.max(0, projectedSavedPence);
  const denom = savedForBar + Math.max(0, totalSpentPence);

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
  };
}
