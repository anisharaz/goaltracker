"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultColumn, uniqueIdentifier } from "@/lib/columns";

async function requireUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user.id;
}

export async function createColumn(formData: FormData) {
  const userId = await requireUserId();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const identifier = await uniqueIdentifier(userId, name);

  const last = await prisma.column.findFirst({
    where: { userId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const column = await prisma.column.create({
    data: {
      userId,
      name,
      identifier,
      order: (last?.order ?? -1) + 1,
    },
  });

  revalidatePath("/dashboard");

  return { id: column.id };
}

export async function deleteColumn(columnId: string) {
  const userId = await requireUserId();

  const column = await prisma.column.findUnique({ where: { id: columnId } });
  if (!column || column.userId !== userId) throw new Error("Column not found");
  if (column.isDefault) throw new Error("The Default column can't be deleted");
  if (column.isMilestone) throw new Error("The Milestones column can't be deleted");

  const defaultColumn = await ensureDefaultColumn(userId);

  await prisma.$transaction([
    prisma.goal.updateMany({
      where: { columnId: column.id },
      data: { columnId: defaultColumn.id },
    }),
    prisma.column.delete({ where: { id: column.id } }),
  ]);

  revalidatePath("/dashboard");
}

export async function reorderColumns(orderedColumnIds: string[]) {
  const userId = await requireUserId();

  const columns = await prisma.column.findMany({ where: { id: { in: orderedColumnIds } } });
  if (columns.length !== orderedColumnIds.length || columns.some((c) => c.userId !== userId)) {
    throw new Error("Column not found");
  }
  if (columns.some((c) => c.isDefault || c.isMilestone)) {
    throw new Error("The Default and Milestones columns can't be reordered");
  }

  await prisma.$transaction(
    orderedColumnIds.map((id, index) => prisma.column.update({ where: { id }, data: { order: index } })),
  );

  revalidatePath("/dashboard");
}
