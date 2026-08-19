import { toDateOnly, lastNDates } from "@/lib/dates";

/**
 * Recomputes streaks from the full check-in history, rather than patching
 * incrementally — this stays correct even when a check-in is backfilled for
 * a past date rather than submitted for "today".
 */
export function computeStreaks(
  goal: { recurrenceType: string; activeWeekdays: number[] },
  checkIns: { date: Date; completed: boolean }[],
): { currentStreak: number; longestStreak: number; lastCompletedAt: Date | null } {
  const completedDates = checkIns
    .filter((c) => c.completed)
    .map((c) => toDateOnly(c.date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (completedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastCompletedAt: null };
  }

  const isScheduled = (d: Date) =>
    goal.recurrenceType === "RECURRING" ? goal.activeWeekdays.includes(d.getUTCDay()) : true;

  // Whether any scheduled day falls strictly between `from` and `to` (both exclusive).
  function hasScheduledGap(from: Date, to: Date) {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + 1);
    while (d.getTime() < to.getTime()) {
      if (isScheduled(d)) return true;
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return false;
  }

  let longestStreak = 0;
  let running = 0;
  let previous: Date | null = null;

  for (const date of completedDates) {
    running = previous && !hasScheduledGap(previous, date) ? running + 1 : 1;
    longestStreak = Math.max(longestStreak, running);
    previous = date;
  }

  const lastCompletedAt = completedDates[completedDates.length - 1];
  const today = toDateOnly(new Date());
  // The tail run is still "current" as long as no scheduled day between the
  // last completion and today has been missed.
  const currentStreak = hasScheduledGap(lastCompletedAt, today) ? 0 : running;

  return { currentStreak, longestStreak, lastCompletedAt };
}

export function computeCompletionRate(
  goal: { recurrenceType: string; activeWeekdays: number[] },
  checkIns: { date: Date; completed: boolean }[],
  windowDays = 30,
) {
  const completedDates = new Set(
    checkIns.filter((c) => c.completed).map((c) => toDateOnly(c.date).getTime()),
  );
  const window = lastNDates(windowDays);

  const scheduledDays =
    goal.recurrenceType === "RECURRING"
      ? window.filter((d) => goal.activeWeekdays.includes(d.getUTCDay()))
      : window;

  if (scheduledDays.length === 0) return 0;

  const completedScheduled = scheduledDays.filter((d) => completedDates.has(d.getTime())).length;
  return Math.round((completedScheduled / scheduledDays.length) * 100);
}

export function averageRating(checkIns: { rating: number | null }[]) {
  const rated = checkIns.filter((c): c is { rating: number } => c.rating != null);
  if (rated.length === 0) return null;
  return Math.round((rated.reduce((sum, c) => sum + c.rating, 0) / rated.length) * 10) / 10;
}
