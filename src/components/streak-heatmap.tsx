import { lastNDates, toDateOnly } from "@/lib/dates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type CellState = "empty" | "completed" | "missed" | "not-scheduled" | "future";

const CELL_CLASS: Record<CellState, string> = {
  empty: "opacity-0",
  completed: "bg-primary",
  missed: "bg-muted-foreground/25",
  "not-scheduled": "bg-muted/60",
  future: "border border-dashed border-border",
};

const WEEKS = 26;

export function StreakHeatmap({
  checkIns,
  activeWeekdays,
  recurrenceType,
}: {
  checkIns: { date: Date; completed: boolean }[];
  activeWeekdays: number[];
  recurrenceType: "RECURRING" | "MONTHLY" | "NONE";
}) {
  const today = toDateOnly(new Date());
  const window = lastNDates(WEEKS * 7);
  const completedDates = new Set(
    checkIns.filter((c) => c.completed).map((c) => toDateOnly(c.date).getTime()),
  );

  // Pad the front so the grid starts on a Sunday, keeping weekday rows aligned.
  const padStart = window[0].getUTCDay();
  const paddedWindow: (Date | null)[] = [...Array.from({ length: padStart }, () => null), ...window];

  const weekColumns: (Date | null)[][] = [];
  for (let i = 0; i < paddedWindow.length; i += 7) {
    weekColumns.push(paddedWindow.slice(i, i + 7));
  }

  function cellState(date: Date | null): CellState {
    if (!date) return "empty";
    if (date.getTime() > today.getTime()) return "future";
    if (completedDates.has(date.getTime())) return "completed";
    const isScheduled = recurrenceType === "RECURRING" ? activeWeekdays.includes(date.getUTCDay()) : true;
    return isScheduled ? "missed" : "not-scheduled";
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Activity</CardTitle>
        <CardDescription>Last {WEEKS} weeks of check-ins</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ScrollArea className="w-full" type="always">
          <div className="flex gap-1 pb-2">
            {weekColumns.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((date, dayIndex) => {
                  const state = cellState(date);
                  return (
                    <div
                      key={dayIndex}
                      title={
                        date
                          ? `${date.toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })} — ${state === "completed" ? "Completed" : state === "missed" ? "Missed" : state === "future" ? "Upcoming" : "Not scheduled"}`
                          : undefined
                      }
                      className={cn("size-3 rounded-[3px]", CELL_CLASS[state])}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-primary" />
            Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-muted-foreground/25" />
            Missed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-muted/60" />
            Not scheduled
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
