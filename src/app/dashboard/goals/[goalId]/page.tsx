import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Flame, Percent, Star, Trophy, type LucideIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lastNDates } from "@/lib/dates";
import { computeCompletionRate, averageRating } from "@/lib/goal-stats";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalCharts } from "@/components/goal-charts";
import { DeleteGoalButton } from "@/components/delete-goal-button";
import { BackgroundDecoration } from "@/components/background-decoration";
import { Separator } from "@/components/ui/separator";

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

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== session.user.id) notFound();

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
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-muted/40">
      <BackgroundDecoration />
      <div className="flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-20 sm:px-8">
        <div className="animate-in fade-in-0 slide-in-from-top-2 flex flex-col gap-4 duration-500">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
            <DeleteGoalButton goalId={goal.id} goalTitle={goal.title} redirectTo="/dashboard" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h1>{goal.title}</h1>
              <Badge variant="secondary">{TYPE_LABEL[goal.type]}</Badge>
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
              <CardTitle>Target date</CardTitle>
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
          </Card>
        ) : (
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
        )}
      </div>
    </div>
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
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {c.date.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <div className="flex items-center gap-2">
                {goalType === "NUMERIC" && c.value != null && (
                  <span className="text-sm text-muted-foreground">
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
