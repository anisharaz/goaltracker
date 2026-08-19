export function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Formats a date as "YYYY-MM-DD" for an `<input type="date">` value/defaultValue. */
export function toDateInputValue(date: Date): string {
  return toDateOnly(date).toISOString().slice(0, 10);
}

export type MilestoneUrgency = "overdue" | "due-soon" | null;

/** How urgent an incomplete milestone's target date is, relative to today. */
export function getMilestoneUrgency(targetDate: Date | null, completedAt: Date | null): MilestoneUrgency {
  if (completedAt || !targetDate) return null;
  const today = toDateOnly(new Date());
  const target = toDateOnly(new Date(targetDate));
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "due-soon";
  return null;
}

/** The last `n` calendar dates ending today (inclusive), oldest first. */
export function lastNDates(n: number, from: Date = new Date()): Date[] {
  const today = toDateOnly(from);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (n - 1 - i));
    return d;
  });
}
