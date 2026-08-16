import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import { ensureDefaultColumn } from "@/lib/columns";
import { SignOutButton } from "@/components/sign-out-button";
import { CreateGoalForm } from "@/components/create-goal-form";
import { GoalBoard, type BoardGoal } from "@/components/goal-board";
import { GoalSearch } from "@/components/goal-search";
import { ClearHighlightParam } from "@/components/clear-highlight-param";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackgroundDecoration } from "@/components/background-decoration";
import { Separator } from "@/components/ui/separator";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; highlight?: string }>;
}) {
  const { q, highlight } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  const defaultColumn = await ensureDefaultColumn(session.user.id);

  const [columns, goals] = await Promise.all([
    prisma.column.findMany({
      where: { userId: session.user.id },
      orderBy: { order: "asc" },
    }),
    prisma.goal.findMany({
      where: {
        userId: session.user.id,
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const today = toDateOnly(new Date());
  const todaysCheckIns = await prisma.checkIn.findMany({
    where: { goalId: { in: goals.map((g) => g.id) }, date: today },
  });
  const checkInByGoalId = new Map(todaysCheckIns.map((c) => [c.goalId, c]));

  const boardGoals: BoardGoal[] = goals.map((goal) => {
    const todaysCheckIn = checkInByGoalId.get(goal.id) ?? null;
    return {
      id: goal.id,
      title: goal.title,
      type: goal.type,
      targetUnit: goal.targetUnit,
      currentStreak: goal.currentStreak,
      columnId: goal.columnId ?? defaultColumn.id,
      todaysCheckIn: todaysCheckIn
        ? {
            completed: todaysCheckIn.completed,
            note: todaysCheckIn.note,
            rating: todaysCheckIn.rating,
            value: todaysCheckIn.value,
          }
        : null,
    };
  });

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-muted/40">
      <BackgroundDecoration />
      {highlight && <ClearHighlightParam />}
      <div className="flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:gap-12 sm:px-8 sm:py-20">
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
            <div className="flex flex-wrap items-center gap-2">
              <Suspense>
                <GoalSearch />
              </Suspense>
              <CreateGoalForm
                columns={columns.map((c) => ({ id: c.id, name: c.name }))}
                defaultColumnId={defaultColumn.id}
              />
            </div>
          </div>

          {goals.length === 0 && q ? (
            <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
              No goals match &quot;{q}&quot;.
            </p>
          ) : (
            <GoalBoard
              columns={columns.map((c) => ({ id: c.id, name: c.name, isDefault: c.isDefault }))}
              goals={boardGoals}
              highlightGoalId={highlight}
            />
          )}
        </section>
      </div>
    </div>
  );
}
