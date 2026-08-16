import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import { SignOutButton } from "@/components/sign-out-button";
import { CreateGoalForm } from "@/components/create-goal-form";
import { CheckInDialog } from "@/components/check-in-dialog";
import { DeleteGoalButton } from "@/components/delete-goal-button";
import { GoalSearch } from "@/components/goal-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackgroundDecoration } from "@/components/background-decoration";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  HABIT: "Habit",
  NUMERIC: "Numeric",
  MILESTONE: "Milestone",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  const goals = await prisma.goal.findMany({
    where: {
      userId: session.user.id,
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const today = toDateOnly(new Date());
  const todaysCheckIns = await prisma.checkIn.findMany({
    where: { goalId: { in: goals.map((g) => g.id) }, date: today },
  });
  const checkInByGoalId = new Map(todaysCheckIns.map((c) => [c.goalId, c]));

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-muted/40">
      <BackgroundDecoration />
      <div className="flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-20 sm:px-8">
        <header className="animate-in fade-in-0 slide-in-from-top-2 flex flex-wrap items-center justify-between gap-4 duration-500">
          <div className="flex flex-col gap-1.5">
            <h1>Welcome, {session.user.name}</h1>
            <p className="text-sm text-muted-foreground">{session.user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <Separator />

        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2>Your goals</h2>
            <div className="flex items-center gap-2">
              <Suspense>
                <GoalSearch />
              </Suspense>
              <CreateGoalForm />
            </div>
          </div>

          {goals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {q ? `No goals match "${q}".` : "No goals yet. Add one to get started."}
              </CardContent>
            </Card>
          ) : (
            <ul className="flex flex-col gap-4">
              {goals.map((goal, index) => {
                const todaysCheckIn = checkInByGoalId.get(goal.id) ?? null;
                return (
                  <li
                    key={goal.id}
                    className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-300"
                    style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
                  >
                    <Card
                      className={cn(
                        "transition-shadow hover:shadow-md",
                        todaysCheckIn?.completed && "ring-1 ring-primary/25 bg-primary/[0.03]",
                      )}
                    >
                      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                          href={`/dashboard/goals/${goal.id}`}
                          className="flex flex-1 flex-col gap-1.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <div className="flex items-center gap-2">
                            <p className="font-medium hover:underline">{goal.title}</p>
                            <Badge variant="secondary">{TYPE_LABEL[goal.type]}</Badge>
                          </div>
                          {goal.currentStreak > 0 && (
                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Flame className="size-3.5 text-primary" />
                              {goal.currentStreak} day streak
                            </p>
                          )}
                        </Link>
                        <Separator orientation="vertical" className="hidden h-10 sm:block" />
                        <div className="flex items-center gap-1">
                          {goal.type !== "MILESTONE" && (
                            <CheckInDialog
                              goalId={goal.id}
                              goalType={goal.type}
                              targetUnit={goal.targetUnit}
                              alreadyCompletedToday={todaysCheckIn?.completed ?? false}
                              initialNote={todaysCheckIn?.note ?? null}
                              initialRating={todaysCheckIn?.rating ?? null}
                              initialValue={todaysCheckIn?.value ?? null}
                            />
                          )}
                          <DeleteGoalButton goalId={goal.id} goalTitle={goal.title} />
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
