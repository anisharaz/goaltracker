"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user.id;
}

export async function addGoalTask(goalId: string, formData: FormData) {
  const userId = await requireUserId();

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) throw new Error("Goal not found");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");

  const last = await prisma.goalTask.findFirst({
    where: { goalId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.goalTask.create({
    data: { goalId, title, order: (last?.order ?? -1) + 1 },
  });

  revalidatePath(`/dashboard/goals/${goalId}`);
}

export async function toggleGoalTask(taskId: string) {
  const userId = await requireUserId();

  const task = await prisma.goalTask.findUnique({ where: { id: taskId }, include: { goal: true } });
  if (!task || task.goal.userId !== userId) throw new Error("Task not found");

  const isDone = !task.isDone;

  await prisma.goalTask.update({
    where: { id: taskId },
    data: { isDone, completedAt: isDone ? new Date() : null },
  });

  revalidatePath(`/dashboard/goals/${task.goalId}`);
}

export async function deleteGoalTask(taskId: string) {
  const userId = await requireUserId();

  const task = await prisma.goalTask.findUnique({ where: { id: taskId }, include: { goal: true } });
  if (!task || task.goal.userId !== userId) throw new Error("Task not found");

  await prisma.goalTask.delete({ where: { id: taskId } });

  revalidatePath(`/dashboard/goals/${task.goalId}`);
}
