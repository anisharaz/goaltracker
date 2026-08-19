import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoalActionsMenu } from "@/components/goal-actions-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BackgroundDecoration } from "@/components/background-decoration";
import { Separator } from "@/components/ui/separator";

const TYPE_LABEL: Record<string, string> = {
  HABIT: "Habit",
  NUMERIC: "Numeric",
  MILESTONE: "Milestone",
};

export default async function ArchivedGoalsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id, isArchived: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-muted/40">
      <BackgroundDecoration />
      <div className="flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-8 sm:py-20">
        <div className="animate-in fade-in-0 slide-in-from-top-2 flex flex-col gap-4 duration-500">
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
          <div className="flex flex-col gap-1.5">
            <h1>Archived goals</h1>
            <p className="text-sm text-muted-foreground">
              Unarchive a goal to bring it back to the board, or delete it for good.
            </p>
          </div>
        </div>

        <Separator />

        {goals.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
            No archived goals.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {goals.map((goal) => (
              <Card key={goal.id}>
                <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{goal.title}</p>
                      <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                        {TYPE_LABEL[goal.type]}
                      </Badge>
                    </div>
                    {goal.description && (
                      <p className="truncate text-xs text-muted-foreground">{goal.description}</p>
                    )}
                  </div>
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
                    isArchived
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
