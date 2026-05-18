import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  getDaysInMonth,
} from "date-fns";

// Budget weeks run Tuesday -> Monday. Weekend spend often posts on the
// Monday, so a Tue-Mon week keeps a whole weekend together. (date-fns:
// 0=Sun, 1=Mon, 2=Tue ...)
const WEEK_OPTS = { weekStartsOn: 2 as const };

// The household budget tracking starts here.
export const BUDGET_START = "2026-06-01";

// Single end-of-year savings target date the Outlook projection runs to.
export const OUTLOOK_GOAL_DATE = "2026-12-20";

// Whole months remaining between today and the outlook goal date (>= 0).
// "Full months ahead" - the number of monthly income/spend cycles left.
export function monthsUntilGoal(ref: Date = new Date()): number {
  return Math.max(0, differenceInCalendarMonths(new Date(OUTLOOK_GOAL_DATE), ref));
}

export function now(): Date {
  return new Date();
}

// Returns YYYY-MM-DD (matches Postgres `date` columns / Drizzle string dates).
export function isoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function weekRange(ref: Date = new Date()): {
  start: string;
  end: string;
} {
  return {
    start: isoDate(startOfWeek(ref, WEEK_OPTS)),
    end: isoDate(endOfWeek(ref, WEEK_OPTS)),
  };
}

// The most recently completed Tue-Mon week. The household uploads last week's
// export, so "this week" is usually empty - last week is the useful view.
export function lastWeekRange(ref: Date = new Date()): {
  start: string;
  end: string;
} {
  const sevenDaysAgo = new Date(ref);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return weekRange(sevenDaysAgo);
}

export function monthRange(ref: Date = new Date()): {
  start: string;
  end: string;
} {
  return {
    start: isoDate(startOfMonth(ref)),
    end: isoDate(endOfMonth(ref)),
  };
}

// Linear projection: given spend-to-date over elapsed days, project the
// end-of-period total assuming the current rate continues.
export function projectMonthEnd(spentPence: number, ref: Date = new Date()): number {
  const dayOfMonth = ref.getDate();
  const daysInMonth = getDaysInMonth(ref);
  if (dayOfMonth <= 0) return spentPence;
  return Math.round((spentPence / dayOfMonth) * daysInMonth);
}

export function daysLeftInMonth(ref: Date = new Date()): number {
  return getDaysInMonth(ref) - ref.getDate();
}

// Whole days from `ref` through the end of its (Tue-Mon) week, inclusive of
// today. e.g. Monday -> 1, Sunday -> 2, Tuesday -> 7.
export function daysLeftInWeek(ref: Date = new Date()): number {
  const end = endOfWeek(ref, WEEK_OPTS);
  return differenceInCalendarDays(end, ref) + 1;
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return differenceInCalendarDays(new Date(), new Date(iso));
}

export function formatDisplayDate(iso: string): string {
  return format(new Date(iso), "d MMM yyyy");
}

// Includes the weekday so a week range is unambiguous, e.g. "Mon 11 May".
export function formatDayDate(iso: string): string {
  return format(new Date(iso), "EEE d MMM");
}

export function formatMonthLabel(iso: string): string {
  return format(new Date(iso), "MMM yyyy");
}
