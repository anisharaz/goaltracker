import { prisma } from "@/lib/prisma";
import { GoalType } from "@/generated/prisma/enums";

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "column";
}

export async function uniqueIdentifier(userId: string, name: string): Promise<string> {
  const base = slugify(name);
  const existing = await prisma.column.findMany({
    where: { userId, identifier: { startsWith: base } },
    select: { identifier: true },
  });
  const taken = new Set(existing.map((c) => c.identifier));
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

const DEFAULT_COLUMN_NAME = "Default";
const DEFAULT_COLUMN_IDENTIFIER = "default";

/**
 * Every user needs exactly one non-deletable Default column. Also
 * self-heals: any non-milestone goal left with a null columnId (legacy
 * data, or a column deleted outside the normal flow) gets reassigned
 * here. Milestones are handled separately by ensureMilestonesColumn.
 */
export async function ensureDefaultColumn(userId: string) {
  let defaultColumn = await prisma.column.findFirst({ where: { userId, isDefault: true } });

  if (!defaultColumn) {
    defaultColumn = await prisma.column.create({
      data: {
        userId,
        name: DEFAULT_COLUMN_NAME,
        identifier: DEFAULT_COLUMN_IDENTIFIER,
        isDefault: true,
        order: 0,
      },
    });
  }

  await prisma.goal.updateMany({
    where: { userId, columnId: null, type: { not: GoalType.MILESTONE } },
    data: { columnId: defaultColumn.id },
  });

  return defaultColumn;
}

const MILESTONES_COLUMN_NAME = "Milestones";
const MILESTONES_COLUMN_IDENTIFIER = "milestones";

/**
 * Every user also gets one non-deletable Milestones column. Every
 * MILESTONE-type goal always lives here — self-heals by reassigning
 * any milestone goal not already in this column (legacy data, or one
 * left behind by a column that was deleted outside the normal flow).
 */
export async function ensureMilestonesColumn(userId: string) {
  let milestonesColumn = await prisma.column.findFirst({ where: { userId, isMilestone: true } });

  if (!milestonesColumn) {
    milestonesColumn = await prisma.column.create({
      data: {
        userId,
        name: MILESTONES_COLUMN_NAME,
        identifier: MILESTONES_COLUMN_IDENTIFIER,
        isMilestone: true,
        order: 1,
      },
    });
  }

  await prisma.goal.updateMany({
    where: { userId, type: GoalType.MILESTONE, columnId: { not: milestonesColumn.id } },
    data: { columnId: milestonesColumn.id },
  });

  return milestonesColumn;
}
