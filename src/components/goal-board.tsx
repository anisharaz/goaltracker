"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDndContext,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Flame, GripVertical, Plus } from "lucide-react";

import { reorderGoals } from "@/app/dashboard/actions";
import { reorderColumns } from "@/app/dashboard/column-actions";
import { CheckInDialog } from "@/components/check-in-dialog";
import { GoalActionsMenu } from "@/components/goal-actions-menu";
import { CreateColumnForm } from "@/components/create-column-form";
import { CreateGoalForm } from "@/components/create-goal-form";
import { DeleteColumnButton } from "@/components/delete-column-button";
import { MilestoneCompleteButton } from "@/components/milestone-complete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getMilestoneUrgency } from "@/lib/dates";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  HABIT: "Habit",
  NUMERIC: "Numeric",
  MILESTONE: "Milestone",
};

export type BoardGoal = {
  id: string;
  title: string;
  description: string | null;
  type: "HABIT" | "NUMERIC" | "MILESTONE";
  recurrenceType: "RECURRING" | "MONTHLY" | "NONE";
  targetValue: number | null;
  targetUnit: string | null;
  targetDate: Date | null;
  activeWeekdays: number[];
  currentStreak: number;
  columnId: string | null;
  completedAt: Date | null;
  todaysCheckIn: {
    completed: boolean;
    note: string | null;
    rating: number | null;
    value: number | null;
  } | null;
};

export type BoardColumnData = {
  id: string;
  name: string;
  isDefault: boolean;
  isMilestone: boolean;
};

export function GoalBoard({
  columns,
  goals,
  highlightGoalId,
}: {
  columns: BoardColumnData[];
  goals: BoardGoal[];
  highlightGoalId?: string;
}) {
  const [items, setItems] = useState(goals);
  const [columnItems, setColumnItems] = useState(columns);
  const [activeGoal, setActiveGoal] = useState<BoardGoal | null>(null);
  const [activeColumn, setActiveColumn] = useState<BoardColumnData | null>(null);

  // Resync local (optimistic) state whenever the server sends fresh data —
  // adjusting state during render, per React's guidance, instead of an
  // effect (avoids an extra commit + the set-state-in-effect lint rule).
  const [prevGoals, setPrevGoals] = useState(goals);
  if (goals !== prevGoals) {
    setPrevGoals(goals);
    setItems(goals);
  }
  const [prevColumns, setPrevColumns] = useState(columns);
  if (columns !== prevColumns) {
    setPrevColumns(columns);
    setColumnItems(columns);
  }

  const pinnedColumns = columnItems.filter((c) => c.isDefault || c.isMilestone);
  const customColumns = columnItems.filter((c) => !c.isDefault && !c.isMilestone);
  const selectableColumns = columnItems.filter((c) => !c.isMilestone).map((c) => ({ id: c.id, name: c.name }));
  const defaultColumnId = columnItems.find((c) => c.isDefault)?.id ?? selectableColumns[0]?.id ?? "";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "column") {
      setActiveColumn(columnItems.find((c) => c.id === event.active.id) ?? null);
    } else {
      setActiveGoal(items.find((g) => g.id === event.active.id) ?? null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const isColumnDrag = active.data.current?.type === "column";
    setActiveGoal(null);
    setActiveColumn(null);
    if (!over) return;

    if (isColumnDrag) {
      const oldIndex = customColumns.findIndex((c) => c.id === active.id);
      const newIndex = customColumns.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const previousColumns = columnItems;
      const reorderedCustom = arrayMove(customColumns, oldIndex, newIndex);
      setColumnItems([...pinnedColumns, ...reorderedCustom]);

      reorderColumns(reorderedCustom.map((c) => c.id)).catch(() => setColumnItems(previousColumns));
      return;
    }

    const goalId = String(active.id);
    const goal = items.find((g) => g.id === goalId);
    if (!goal) return;

    const overId = String(over.id);
    const overIsColumn = columnItems.some((c) => c.id === overId);
    const targetColumnId = overIsColumn ? overId : items.find((g) => g.id === overId)?.columnId;
    if (!targetColumnId) return;

    const targetColumn = columnItems.find((c) => c.id === targetColumnId);
    if (!targetColumn || targetColumn.isMilestone !== (goal.type === "MILESTONE")) return;

    if (goal.columnId === targetColumnId && overId === goalId) return;

    const previousItems = items;
    const withoutGoal = items.filter((g) => g.id !== goalId);
    let insertAt: number;
    if (overIsColumn) {
      let lastIdx = -1;
      withoutGoal.forEach((g, i) => {
        if (g.columnId === targetColumnId) lastIdx = i;
      });
      insertAt = lastIdx + 1;
    } else {
      insertAt = withoutGoal.findIndex((g) => g.id === overId);
      if (insertAt === -1) insertAt = withoutGoal.length;
    }
    const movedGoal = { ...goal, columnId: targetColumnId };
    const newItems = [...withoutGoal.slice(0, insertAt), movedGoal, ...withoutGoal.slice(insertAt)];
    setItems(newItems);

    const orderedIdsForColumn = newItems.filter((g) => g.columnId === targetColumnId).map((g) => g.id);
    reorderGoals(targetColumnId, orderedIdsForColumn).catch(() => setItems(previousItems));
  }

  return (
    <DndContext
      id="goal-board"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full" type="always">
        <div className="flex snap-x snap-mandatory gap-4 pb-4 sm:snap-none">
          {pinnedColumns.map((column) => (
            <PinnedColumnView
              key={column.id}
              column={column}
              goals={items.filter((g) => g.columnId === column.id)}
              highlightGoalId={highlightGoalId}
              selectableColumns={selectableColumns}
              defaultColumnId={defaultColumnId}
            />
          ))}
          <SortableContext items={customColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {customColumns.map((column) => (
              <SortableColumnView
                key={column.id}
                column={column}
                goals={items.filter((g) => g.columnId === column.id)}
                highlightGoalId={highlightGoalId}
              />
            ))}
          </SortableContext>
          <div className="w-72 shrink-0 pt-1 sm:w-80">
            <CreateColumnForm />
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeGoal ? (
          <GoalCardContent goal={activeGoal} dragging />
        ) : activeColumn ? (
          <ColumnDragPreview column={activeColumn} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ColumnHeader({
  column,
  goalCount,
  dragHandleProps,
  children,
}: {
  column: BoardColumnData;
  goalCount: number;
  dragHandleProps?: Record<string, unknown>;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <div className="flex min-w-0 items-center gap-1.5">
        {dragHandleProps && (
          <button
            type="button"
            {...dragHandleProps}
            className="shrink-0 touch-none text-muted-foreground/40 hover:text-muted-foreground"
            aria-label={`Drag to reorder ${column.name} column`}
          >
            <GripVertical className="size-4" />
          </button>
        )}
        <h3 className="truncate text-sm font-semibold">{column.name}</h3>
        <Badge variant="secondary" className="shrink-0">
          {goalCount}
        </Badge>
      </div>
      {children}
    </div>
  );
}

function GoalList({ goals, highlightGoalId }: { goals: BoardGoal[]; highlightGoalId?: string }) {
  return (
    <div className="flex min-h-20 flex-col gap-2">
      {goals.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
          No goals here
        </p>
      ) : (
        <SortableContext items={goals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          {goals.map((goal) => (
            <SortableGoalCard key={goal.id} goal={goal} highlighted={goal.id === highlightGoalId} />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

function PinnedColumnView({
  column,
  goals,
  highlightGoalId,
  selectableColumns,
  defaultColumnId,
}: {
  column: BoardColumnData;
  goals: BoardGoal[];
  highlightGoalId?: string;
  selectableColumns: { id: string; name: string }[];
  defaultColumnId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[28rem] w-72 shrink-0 snap-start flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors sm:w-80",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      <ColumnHeader column={column} goalCount={goals.length}>
        {column.isDefault ? (
          <CreateGoalForm
            columns={selectableColumns}
            defaultColumnId={column.id}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Add goal" className="shrink-0">
                <Plus />
              </Button>
            }
          />
        ) : (
          <CreateGoalForm
            columns={selectableColumns}
            defaultColumnId={defaultColumnId}
            initialType="MILESTONE"
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Add milestone" className="shrink-0">
                <Plus />
              </Button>
            }
          />
        )}
      </ColumnHeader>

      <GoalList goals={goals} highlightGoalId={highlightGoalId} />
    </div>
  );
}

function SortableColumnView({
  column,
  goals,
  highlightGoalId,
}: {
  column: BoardColumnData;
  goals: BoardGoal[];
  highlightGoalId?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column" },
  });
  const { over } = useDndContext();
  const isOver = over?.id === column.id;
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex min-h-[28rem] w-72 shrink-0 snap-start flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors sm:w-80",
        isOver && "border-primary/50 bg-primary/5",
        isDragging && "opacity-40",
      )}
    >
      <ColumnHeader column={column} goalCount={goals.length} dragHandleProps={{ ...attributes, ...listeners }}>
        <DeleteColumnButton columnId={column.id} columnName={column.name} />
      </ColumnHeader>

      <GoalList goals={goals} highlightGoalId={highlightGoalId} />
    </div>
  );
}

function ColumnDragPreview({ column }: { column: BoardColumnData }) {
  return (
    <div className="flex w-72 shrink-0 rotate-2 items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 shadow-lg sm:w-80">
      <GripVertical className="size-4 text-muted-foreground" />
      <h3 className="truncate text-sm font-semibold">{column.name}</h3>
    </div>
  );
}

function SortableGoalCard({ goal, highlighted }: { goal: BoardGoal; highlighted?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: goal.id,
    data: { type: "goal", columnId: goal.columnId },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
      <GoalCardContent goal={goal} dragHandleProps={{ ...attributes, ...listeners }} highlighted={highlighted} />
    </div>
  );
}

function GoalCardContent({
  goal,
  dragHandleProps,
  dragging,
  highlighted,
}: {
  goal: BoardGoal;
  dragHandleProps?: Record<string, unknown>;
  dragging?: boolean;
  highlighted?: boolean;
}) {
  const urgency = goal.type === "MILESTONE" ? getMilestoneUrgency(goal.targetDate, goal.completedAt) : null;

  return (
    <Card
      className={cn(
        "gap-3 py-3 transition-shadow hover:shadow-md",
        dragging && "rotate-2 shadow-lg",
        goal.todaysCheckIn?.completed && "ring-1 ring-primary/25 bg-primary/[0.03]",
        goal.type === "MILESTONE" &&
          goal.completedAt &&
          "ring-1 ring-[color:var(--chart-3)]/30 bg-[color:var(--chart-3)]/[0.05]",
        urgency === "overdue" && "ring-1 ring-destructive/30 bg-destructive/[0.03]",
        urgency === "due-soon" && "ring-1 ring-amber-500/30 bg-amber-500/[0.03]",
        highlighted && "animate-highlight-glow",
      )}
    >
      <CardContent className="flex flex-col gap-2 px-3">
        <div className="flex items-start gap-1.5">
          <button
            type="button"
            {...dragHandleProps}
            className="mt-0.5 shrink-0 touch-none text-muted-foreground/50 hover:text-muted-foreground"
            aria-label="Drag to move"
          >
            <GripVertical className="size-4" />
          </button>
          <Link
            href={`/dashboard/goals/${goal.id}`}
            className="group flex min-w-0 flex-1 flex-col gap-1"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-medium group-hover:underline">{goal.title}</p>
              <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                {TYPE_LABEL[goal.type]}
              </Badge>
              {urgency && (
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 px-1.5 py-0 text-[10px]",
                    urgency === "overdue"
                      ? "border-destructive/40 text-destructive"
                      : "border-amber-500/40 text-amber-600 dark:text-amber-400",
                  )}
                >
                  {urgency === "overdue" ? "Overdue" : "Due soon"}
                </Badge>
              )}
            </div>
            {goal.currentStreak > 0 && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Flame className="size-3 text-primary" />
                {goal.currentStreak} day streak
              </p>
            )}
          </Link>
        </div>

        <div className="flex items-center justify-between gap-2 pl-5.5">
          {goal.type !== "MILESTONE" ? (
            <CheckInDialog
              goalId={goal.id}
              goalType={goal.type}
              targetUnit={goal.targetUnit}
              alreadyCompletedToday={goal.todaysCheckIn?.completed ?? false}
              initialNote={goal.todaysCheckIn?.note ?? null}
              initialRating={goal.todaysCheckIn?.rating ?? null}
              initialValue={goal.todaysCheckIn?.value ?? null}
            />
          ) : (
            <MilestoneCompleteButton goalId={goal.id} completed={goal.completedAt != null} />
          )}
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
          />
        </div>
      </CardContent>
    </Card>
  );
}
