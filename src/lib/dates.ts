export function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isSameDate(a: Date, b: Date): boolean {
  return toDateOnly(a).getTime() === toDateOnly(b).getTime();
}

/** The most recent day before `date` that falls on one of `activeWeekdays` (0=Sun..6=Sat). */
export function previousActiveDate(date: Date, activeWeekdays: number[]): Date {
  const d = toDateOnly(date);
  do {
    d.setUTCDate(d.getUTCDate() - 1);
  } while (!activeWeekdays.includes(d.getUTCDay()));
  return d;
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
