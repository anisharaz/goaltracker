"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoalType, RecurrenceType } from "@/generated/prisma/enums";
import { previousActiveDate, isSameDate, toDateOnly } from "@/lib/dates";
import { ensureMilestonesColumn } from "@/lib/columns";

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

  const goal = await prisma.goal.create({
    data: {
      userId,
      columnId,
      title,
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
}

export async function submitCheckIn(input: {
  goalId: string;
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

  const existing = await prisma.checkIn.findUnique({
    where: { goalId_date: { goalId: goal.id, date: today } },
  });

  await prisma.checkIn.upsert({
    where: { goalId_date: { goalId: goal.id, date: today } },
    create: {
      goalId: goal.id,
      date: today,
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

  // Only recompute the streak the first time today is completed; edits to
  // note/rating on an already-completed day shouldn't double-count it.
  const streakIncreased = !existing?.completed;
  let currentStreak = goal.currentStreak;

  if (streakIncreased) {
    if (goal.recurrenceType === RecurrenceType.RECURRING) {
      const prevActive = previousActiveDate(today, goal.activeWeekdays);
      const continuesStreak = goal.lastCompletedAt && isSameDate(goal.lastCompletedAt, prevActive);
      currentStreak = continuesStreak ? goal.currentStreak + 1 : 1;
    } else {
      currentStreak = goal.currentStreak + 1;
    }

    await prisma.goal.update({
      where: { id: goal.id },
      data: {
        currentStreak,
        longestStreak: Math.max(goal.longestStreak, currentStreak),
        lastCompletedAt: today,
      },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/goals/${goal.id}`);

  return { streakIncreased, currentStreak };
}
