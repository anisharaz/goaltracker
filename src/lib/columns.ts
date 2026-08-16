import { prisma } from "@/lib/prisma";

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
 * self-heals: any goal left with a null columnId (legacy data, or a
 * column deleted outside the normal flow) gets reassigned here.
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
    where: { userId, columnId: null },
    data: { columnId: defaultColumn.id },
  });

  return defaultColumn;
}
