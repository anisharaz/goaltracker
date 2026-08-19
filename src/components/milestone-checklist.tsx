"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

import { addGoalTask, deleteGoalTask, toggleGoalTask } from "@/app/dashboard/goal-task-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type MilestoneTask = {
  id: string;
  title: string;
  isDone: boolean;
};

export function MilestoneChecklist({ goalId, tasks }: { goalId: string; tasks: MilestoneTask[] }) {
  const [isAdding, startAddTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startAddTransition(async () => {
      await addGoalTask(goalId, formData);
      startAddTransition(() => {
        router.refresh();
        formRef.current?.reset();
      });
    });
  }

  const doneCount = tasks.filter((t) => t.isDone).length;

  return (
    <div className="flex flex-col gap-3">
      {tasks.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {doneCount} of {tasks.length} done
        </p>
      )}

      {tasks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {tasks.map((task) => (
            <ChecklistRow key={task.id} task={task} />
          ))}
        </div>
      )}

      <form ref={formRef} onSubmit={handleAdd} className="flex items-center gap-2">
        <Input name="title" placeholder="Add a step…" className="h-8 flex-1" required />
        <Button type="submit" size="icon-sm" variant="outline" disabled={isAdding} aria-label="Add step">
          {isAdding ? <Spinner /> : <Plus />}
        </Button>
      </form>
    </div>
  );
}

function ChecklistRow({ task }: { task: MilestoneTask }) {
  const [isToggling, startToggleTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    startToggleTransition(async () => {
      await toggleGoalTask(task.id);
      startToggleTransition(() => {
        router.refresh();
      });
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteGoalTask(task.id);
      startDeleteTransition(() => {
        router.refresh();
      });
    });
  }

  const isPending = isToggling || isDeleting;

  return (
    <div className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/50">
      <Checkbox checked={task.isDone} disabled={isPending} onCheckedChange={handleToggle} />
      <p className={cn("flex-1 text-sm", task.isDone && "text-muted-foreground line-through")}>
        {task.title}
      </p>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        aria-label={`Remove ${task.title}`}
        className="text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive disabled:opacity-50"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
