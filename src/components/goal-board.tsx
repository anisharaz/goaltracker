"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Flame, GripVertical, Plus } from "lucide-react";

import { moveGoalToColumn } from "@/app/dashboard/actions";
import { CheckInDialog } from "@/components/check-in-dialog";
import { DeleteGoalButton } from "@/components/delete-goal-button";
import { CreateColumnForm } from "@/components/create-column-form";
import { CreateGoalForm } from "@/components/create-goal-form";
import { DeleteColumnButton } from "@/components/delete-column-button";
import { MilestoneCompleteButton } from "@/components/milestone-complete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  HABIT: "Habit",
  NUMERIC: "Numeric",
  MILESTONE: "Milestone",
};

export type BoardGoal = {
  id: string;
  title: string;
  type: "HABIT" | "NUMERIC" | "MILESTONE";
  targetUnit: string | null;
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
  const [activeGoal, setActiveGoal] = useState<BoardGoal | null>(null);

  // Resync local (optimistic) state whenever the server sends fresh goals —
  // adjusting state during render, per React's guidance, instead of an
  // effect (avoids an extra commit + the set-state-in-effect lint rule).
  const [prevGoals, setPrevGoals] = useState(goals);
  if (goals !== prevGoals) {
    setPrevGoals(goals);
    setItems(goals);
  }

  const selectableColumns = columns
    .filter((c) => !c.isMilestone)
    .map((c) => ({ id: c.id, name: c.name }));
  const defaultColumnId = columns.find((c) => c.isDefault)?.id ?? selectableColumns[0]?.id ?? "";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const goal = items.find((g) => g.id === event.active.id);
    setActiveGoal(goal ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveGoal(null);
    const { active, over } = event;
    if (!over) return;

    const goalId = String(active.id);
    const newColumnId = String(over.id);
    const goal = items.find((g) => g.id === goalId);
    if (!goal || goal.columnId === newColumnId) return;

    const targetColumn = columns.find((c) => c.id === newColumnId);
    if (!targetColumn || targetColumn.isMilestone !== (goal.type === "MILESTONE")) return;

    const previousColumnId = goal.columnId;
    setItems((prev) => prev.map((g) => (g.id === goalId ? { ...g, columnId: newColumnId } : g)));

    moveGoalToColumn(goalId, newColumnId).catch(() => {
      setItems((prev) => prev.map((g) => (g.id === goalId ? { ...g, columnId: previousColumnId } : g)));
    });
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
          {columns.map((column) => (
            <BoardColumnView
              key={column.id}
              column={column}
              goals={items.filter((g) => g.columnId === column.id)}
              highlightGoalId={highlightGoalId}
              selectableColumns={selectableColumns}
              defaultColumnId={defaultColumnId}
            />
          ))}
          <div className="w-72 shrink-0 pt-1 sm:w-80">
            <CreateColumnForm />
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>{activeGoal ? <GoalCardContent goal={activeGoal} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}

function BoardColumnView({
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
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{column.name}</h3>
          <Badge variant="secondary" className="shrink-0">
            {goals.length}
          </Badge>
        </div>
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
        ) : column.isMilestone ? (
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
        ) : (
          <DeleteColumnButton columnId={column.id} columnName={column.name} />
        )}
      </div>

      <div className="flex min-h-20 flex-col gap-2">
        {goals.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
            No goals here
          </p>
        ) : (
          goals.map((goal) => (
            <DraggableGoalCard key={goal.id} goal={goal} highlighted={goal.id === highlightGoalId} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableGoalCard({ goal, highlighted }: { goal: BoardGoal; highlighted?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: goal.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

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
  return (
    <Card
      className={cn(
        "gap-3 py-3 transition-shadow hover:shadow-md",
        dragging && "rotate-2 shadow-lg",
        goal.todaysCheckIn?.completed && "ring-1 ring-primary/25 bg-primary/[0.03]",
        goal.type === "MILESTONE" &&
          goal.completedAt &&
          "ring-1 ring-[color:var(--chart-3)]/30 bg-[color:var(--chart-3)]/[0.05]",
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
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-sm font-medium group-hover:underline">{goal.title}</p>
              <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                {TYPE_LABEL[goal.type]}
              </Badge>
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
          <DeleteGoalButton goalId={goal.id} goalTitle={goal.title} />
        </div>
      </CardContent>
    </Card>
  );
}
