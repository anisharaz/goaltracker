import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Flame, Percent, Star, Trophy, type LucideIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lastNDates, getMilestoneUrgency } from "@/lib/dates";
import { computeCompletionRate, averageRating } from "@/lib/goal-stats";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalCharts } from "@/components/goal-charts";
import { GoalStatsSkeleton } from "@/components/goal-stats-skeleton";
import { GoalActionsMenu } from "@/components/goal-actions-menu";
import { MilestoneCompleteButton } from "@/components/milestone-complete-button";
import { MilestoneChecklist } from "@/components/milestone-checklist";
import { BackfillCheckInDialog } from "@/components/backfill-checkin-dialog";
import { BackgroundDecoration } from "@/components/background-decoration";
import { Separator } from "@/components/ui/separator";
import type { GoalModel } from "@/generated/prisma/models";

const TYPE_LABEL: Record<string, string> = {
  HABIT: "Habit",
  NUMERIC: "Numeric",
  MILESTONE: "Milestone",
};

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { tasks: { orderBy: { order: "asc" } } },
  });
  if (!goal || goal.userId !== session.user.id) notFound();

  const milestoneUrgency = getMilestoneUrgency(goal.targetDate, goal.completedAt);

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-muted/40">
      <BackgroundDecoration />
      <div className="flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-12 sm:px-8 sm:py-20">
        <div className="animate-in fade-in-0 slide-in-from-top-2 flex flex-col gap-4 duration-500">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
            <GoalActionsMenu
              goal={{
                id: goal.id,
                title: goal.title,
                description: goal.description,
                type: goal.type,
                recurrenceType: goal.recurrenceType,
                targetValue: goal.targetValue,
                targetUnit: goal.targetUnit,
                targetDate: goal.targetDate,
                activeWeekdays: goal.activeWeekdays,
              }}
              redirectTo="/dashboard"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words">{goal.title}</h1>
              <Badge variant="secondary" className="shrink-0">
                {TYPE_LABEL[goal.type]}
              </Badge>
            </div>
            {goal.description && (
              <p className="text-muted-foreground">{goal.description}</p>
            )}
          </div>
        </div>

        <Separator />

        {goal.type === "MILESTONE" ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Target date</CardTitle>
                {milestoneUrgency && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-1.5 py-0 text-[10px]",
                      milestoneUrgency === "overdue"
                        ? "border-destructive/40 text-destructive"
                        : "border-amber-500/40 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {milestoneUrgency === "overdue" ? "Overdue" : "Due soon"}
                  </Badge>
                )}
              </div>
              <CardDescription>
                {goal.targetDate
                  ? new Date(goal.targetDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "No target date set"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <MilestoneCompleteButton goalId={goal.id} completed={goal.completedAt != null} />
              {goal.completedAt && (
                <p className="text-sm text-muted-foreground">
                  Completed{" "}
                  {new Date(goal.completedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex justify-end">
              <BackfillCheckInDialog goalId={goal.id} goalType={goal.type} targetUnit={goal.targetUnit} />
            </div>
            <Suspense fallback={<GoalStatsSkeleton />}>
              <GoalStatsSection goal={goal} />
            </Suspense>
          </div>
        )}

        {goal.type === "MILESTONE" && (
          <Card>
            <CardHeader>
              <CardTitle>Checklist</CardTitle>
              <CardDescription>Break this milestone into smaller steps.</CardDescription>
            </CardHeader>
            <CardContent>
              <MilestoneChecklist
                goalId={goal.id}
                tasks={goal.tasks.map((t) => ({ id: t.id, title: t.title, isDone: t.isDone }))}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

async function GoalStatsSection({ goal }: { goal: GoalModel }) {
  const checkIns = await prisma.checkIn.findMany({
    where: { goalId: goal.id },
    orderBy: { date: "asc" },
  });

  const completionRate = computeCompletionRate(goal, checkIns);
  const avgRating = averageRating(checkIns);

  const window = lastNDates(30);
  const checkInByTime = new Map(checkIns.map((c) => [c.date.getTime(), c]));
  const chartData = window.map((d) => {
    const c = checkInByTime.get(d.getTime());
    const completed = c?.completed
      ? goal.type === "NUMERIC"
        ? (c.value ?? 1)
        : 1
      : 0;
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed,
      rating: c?.rating ?? null,
    };
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Flame} label="Current streak" value={`${goal.currentStreak}d`} delay={0} />
        <StatCard icon={Trophy} label="Longest streak" value={`${goal.longestStreak}d`} delay={60} />
        <StatCard icon={Percent} label="Last 30 days" value={`${completionRate}%`} delay={120} />
        <StatCard
          icon={Star}
          label="Avg effectiveness"
          value={avgRating !== null ? `${avgRating}/10` : "—"}
          delay={180}
        />
      </div>

      <div className="animate-in fade-in-0 fill-mode-both duration-500" style={{ animationDelay: "150ms" }}>
        <GoalCharts data={chartData} goalType={goal.type} targetUnit={goal.targetUnit} />
      </div>

      <div className="animate-in fade-in-0 fill-mode-both duration-500" style={{ animationDelay: "250ms" }}>
        <RecentCheckIns
          checkIns={[...checkIns].reverse().slice(0, 10)}
          goalType={goal.type}
          targetUnit={goal.targetUnit}
        />
      </div>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delay?: number;
}) {
  return (
    <Card
      className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-300 transition-shadow hover:shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="size-3.5" />
          {label}
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function RecentCheckIns({
  checkIns,
  goalType,
  targetUnit,
}: {
  checkIns: { id: string; date: Date; value: number | null; note: string | null; rating: number | null }[];
  goalType: "HABIT" | "NUMERIC" | "MILESTONE";
  targetUnit: string | null;
}) {
  if (checkIns.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No check-ins yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Recent check-ins</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {checkIns.map((c) => (
          <div key={c.id} className="flex flex-col gap-1.5 border-b border-border pb-4 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-medium">
                {c.date.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <div className="flex min-w-0 items-center gap-2">
                {goalType === "NUMERIC" && c.value != null && (
                  <span className="truncate text-sm text-muted-foreground">
                    {c.value} {targetUnit ?? ""}
                  </span>
                )}
                {c.rating != null && (
                  <Badge variant="outline" className="gap-1">
                    <Star className="size-3" />
                    {c.rating}/10
                  </Badge>
                )}
              </div>
            </div>
            {c.note && <p className="text-sm text-muted-foreground">{c.note}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
