import { toDateOnly, lastNDates } from "@/lib/dates";

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
