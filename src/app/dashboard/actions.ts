"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoalType, RecurrenceType } from "@/generated/prisma/enums";
import { toDateOnly } from "@/lib/dates";
import { ensureMilestonesColumn } from "@/lib/columns";
import { computeStreaks } from "@/lib/goal-stats";

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

async function requireUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user.id;
}

export async function createGoal(formData: FormData) {
  const userId = await requireUserId();

  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "") as GoalType;
  if (!title) throw new Error("Title is required");
  if (!Object.values(GoalType).includes(type)) throw new Error("Invalid goal type");

  let columnId = String(formData.get("columnId") ?? "") || null;

  if (type === GoalType.MILESTONE) {
    // Milestones always live in the user's Milestones column — ignore
    // whatever (if anything) the client sent.
    const milestonesColumn = await ensureMilestonesColumn(userId);
    columnId = milestonesColumn.id;
  } else if (columnId) {
    const column = await prisma.column.findUnique({ where: { id: columnId } });
    if (!column || column.userId !== userId) throw new Error("Column not found");
    if (column.isMilestone) throw new Error("Only milestones can go in the Milestones column");
  }

  const activeWeekdays = ALL_WEEKDAYS.filter((day) => formData.get(`weekday-${day}`) != null);
  const description = String(formData.get("description") ?? "").trim();

  const lastInColumn = await prisma.goal.findFirst({
    where: { userId, columnId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const goal = await prisma.goal.create({
    data: {
      userId,
      columnId,
      order: (lastInColumn?.order ?? -1) + 1,
      title,
      description: description || null,
      type,
      recurrenceType: type === "MILESTONE" ? RecurrenceType.NONE : RecurrenceType.RECURRING,
      activeWeekdays: activeWeekdays.length > 0 ? activeWeekdays : ALL_WEEKDAYS,
      targetValue: type === "NUMERIC" ? Number(formData.get("targetValue")) || null : null,
      targetUnit: type === "NUMERIC" ? String(formData.get("targetUnit") ?? "") || null : null,
      targetDate: type === "MILESTONE" && formData.get("targetDate")
        ? new Date(String(formData.get("targetDate")))
        : null,
    },
  });

  revalidatePath("/dashboard");

  return { id: goal.id };
}

export async function updateGoal(goalId: string, formData: FormData) {
  const userId = await requireUserId();

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) throw new Error("Goal not found");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");
  const description = String(formData.get("description") ?? "").trim();

  const activeWeekdays = ALL_WEEKDAYS.filter((day) => formData.get(`weekday-${day}`) != null);

  await prisma.goal.update({
    where: { id: goalId },
    data: {
      title,
      description: description || null,
      targetValue:
        goal.type === GoalType.NUMERIC ? Number(formData.get("targetValue")) || null : goal.targetValue,
      targetUnit:
        goal.type === GoalType.NUMERIC
          ? String(formData.get("targetUnit") ?? "") || null
          : goal.targetUnit,
      targetDate:
        goal.type === GoalType.MILESTONE
          ? formData.get("targetDate")
            ? new Date(String(formData.get("targetDate")))
            : null
          : goal.targetDate,
      activeWeekdays:
        goal.recurrenceType === RecurrenceType.RECURRING
          ? activeWeekdays.length > 0
            ? activeWeekdays
            : ALL_WEEKDAYS
          : goal.activeWeekdays,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/goals/${goalId}`);
}

export async function moveGoalToColumn(goalId: string, columnId: string) {
  const userId = await requireUserId();

  const [goal, column] = await Promise.all([
    prisma.goal.findUnique({ where: { id: goalId } }),
    prisma.column.findUnique({ where: { id: columnId } }),
  ]);
  if (!goal || goal.userId !== userId) throw new Error("Goal not found");
  if (!column || column.userId !== userId) throw new Error("Column not found");

  const goalIsMilestone = goal.type === GoalType.MILESTONE;
  if (goalIsMilestone !== column.isMilestone) {
    throw new Error(
      goalIsMilestone
        ? "Milestones can only live in the Milestones column"
        : "Only milestones can go in the Milestones column",
    );
  }

  await prisma.goal.update({ where: { id: goalId }, data: { columnId } });

  revalidatePath("/dashboard");
}

export async function toggleMilestoneComplete(goalId: string) {
  const userId = await requireUserId();

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) throw new Error("Goal not found");
  if (goal.type !== GoalType.MILESTONE) throw new Error("Only milestones can be marked complete");

  const completedAt = goal.completedAt ? null : new Date();

  await prisma.goal.update({ where: { id: goalId }, data: { completedAt } });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/goals/${goal.id}`);

  return { completed: completedAt !== null };
}

export async function deleteGoal(goalId: string) {
  const userId = await requireUserId();

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) throw new Error("Goal not found");

  await prisma.goal.delete({ where: { id: goalId } });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/archived");
}

export async function archiveGoal(goalId: string) {
  const userId = await requireUserId();

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) throw new Error("Goal not found");

  await prisma.goal.update({ where: { id: goalId }, data: { isArchived: true } });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/archived");
}

export async function unarchiveGoal(goalId: string) {
  const userId = await requireUserId();

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) throw new Error("Goal not found");

  await prisma.goal.update({ where: { id: goalId }, data: { isArchived: false } });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/archived");
}

export async function submitCheckIn(input: {
  goalId: string;
  date?: string;
  note?: string;
  rating?: number;
  value?: number;
}) {
  const userId = await requireUserId();

  if (input.rating !== undefined && (input.rating < 1 || input.rating > 10)) {
    throw new Error("Rating must be between 1 and 10");
  }

  const goal = await prisma.goal.findUnique({ where: { id: input.goalId } });
  if (!goal || goal.userId !== userId) throw new Error("Goal not found");

  const today = toDateOnly(new Date());
  const date = input.date ? toDateOnly(new Date(input.date)) : today;
  if (date.getTime() > today.getTime()) throw new Error("Can't check in for a future date");

  await prisma.checkIn.upsert({
    where: { goalId_date: { goalId: goal.id, date } },
    create: {
      goalId: goal.id,
      date,
      completed: true,
      value: input.value ?? null,
      note: input.note?.trim() || null,
      rating: input.rating ?? null,
    },
    update: {
      completed: true,
      value: input.value ?? null,
      note: input.note?.trim() || null,
      rating: input.rating ?? null,
    },
  });

  // Recompute from the full history — rather than patching incrementally —
  // so a backfilled past date still yields a correct current/longest streak.
  const allCheckIns = await prisma.checkIn.findMany({ where: { goalId: goal.id } });
  const { currentStreak, longestStreak, lastCompletedAt } = computeStreaks(goal, allCheckIns);

  await prisma.goal.update({
    where: { id: goal.id },
    data: { currentStreak, longestStreak, lastCompletedAt },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/goals/${goal.id}`);

  return { streakIncreased: currentStreak > goal.currentStreak, currentStreak };
}
