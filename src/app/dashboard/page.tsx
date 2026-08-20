import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Archive, Sparkles } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import { getBoardColumns } from "@/lib/columns";
import { SignOutButton } from "@/components/sign-out-button";
import { CreateGoalForm } from "@/components/create-goal-form";
import { GoalBoard, type BoardGoal } from "@/components/goal-board";
import { BoardSkeleton } from "@/components/board-skeleton";
import { GoalSearch } from "@/components/goal-search";
import { ClearHighlightParam } from "@/components/clear-highlight-param";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackgroundDecoration } from "@/components/background-decoration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Only the session check gates the header — everything data-dependent
  // (archived count, column list, the board itself) streams in behind its
  // own Suspense boundary so the app shell paints as soon as possible.
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
            <Suspense fallback={<Skeleton className="h-8 w-24 rounded-lg" />}>
              <ArchivedLink userId={session.user.id} />
            </Suspense>
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
              <Suspense fallback={<Skeleton className="h-8 w-28 rounded-lg" />}>
                <AddGoalButton userId={session.user.id} />
              </Suspense>
            </div>
          </div>

          <Suspense fallback={<BoardSkeleton />}>
            <GoalBoardData userId={session.user.id} q={q} highlight={highlight} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

async function ArchivedLink({ userId }: { userId: string }) {
  const archivedCount = await prisma.goal.count({
    where: { userId, isArchived: true },
  });

  return (
    <Button variant="outline" size="sm" asChild>
      <Link href="/dashboard/archived">
        <Archive />
        Archived
        {archivedCount > 0 && <Badge variant="secondary">{archivedCount}</Badge>}
      </Link>
    </Button>
  );
}

async function AddGoalButton({ userId }: { userId: string }) {
  const { columns, defaultColumnId } = await getBoardColumns(userId);

  return (
    <CreateGoalForm
      columns={columns.filter((c) => !c.isMilestone).map((c) => ({ id: c.id, name: c.name }))}
      defaultColumnId={defaultColumnId}
    />
  );
}

async function GoalBoardData({
  userId,
  q,
  highlight,
}: {
  userId: string;
  q?: string;
  highlight?: string;
}) {
  const { columns, defaultColumnId } = await getBoardColumns(userId);

  const goals = await prisma.goal.findMany({
    where: {
      userId,
      isArchived: false,
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

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
      description: goal.description,
      type: goal.type,
      recurrenceType: goal.recurrenceType,
      targetValue: goal.targetValue,
      targetUnit: goal.targetUnit,
      targetDate: goal.targetDate,
      activeWeekdays: goal.activeWeekdays,
      currentStreak: goal.currentStreak,
      columnId: goal.columnId ?? defaultColumnId,
      completedAt: goal.completedAt,
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

  if (goals.length === 0 && q) {
    return (
      <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
        No goals match &quot;{q}&quot;.
      </p>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-semibold">Create your first goal</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Track a daily habit, a quantity you want to hit, or a one-off milestone — pick whichever
            fits and add it below.
          </p>
        </div>
        <CreateGoalForm
          columns={columns.filter((c) => !c.isMilestone).map((c) => ({ id: c.id, name: c.name }))}
          defaultColumnId={defaultColumnId}
        />
      </div>
    );
  }

  return <GoalBoard columns={columns} goals={boardGoals} highlightGoalId={highlight} />;
}
