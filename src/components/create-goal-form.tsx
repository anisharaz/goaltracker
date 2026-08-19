"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, Hash, Plus, Repeat, type LucideIcon } from "lucide-react";

import { createGoal } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

type GoalType = "HABIT" | "NUMERIC" | "MILESTONE";

const TYPE_OPTIONS: { value: GoalType; label: string; icon: LucideIcon }[] = [
  { value: "HABIT", label: "Habit", icon: Repeat },
  { value: "NUMERIC", label: "Numeric", icon: Hash },
  { value: "MILESTONE", label: "Milestone", icon: Flag },
];

export function CreateGoalForm({
  columns,
  defaultColumnId,
  initialType = "HABIT",
  trigger,
}: {
  columns: { id: string; name: string }[];
  defaultColumnId: string;
  initialType?: GoalType;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<GoalType>(initialType);
  const [columnId, setColumnId] = useState(defaultColumnId);
  const [isSubmitting, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const goal = await createGoal(formData);
      // Keep the pending spinner (and the dialog open) through the
      // navigation too, so the dialog doesn't close before the new goal is
      // actually visible in the list behind it. The `highlight` param lets
      // the list flag exactly which row just got added.
      startTransition(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("highlight", goal.id);
        router.push(url.pathname + url.search, { scroll: false });
        formRef.current?.reset();
        setType(initialType);
        setColumnId(defaultColumnId);
        setOpen(false);
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus />
            Add goal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New goal</DialogTitle>
          <DialogDescription>What do you want to track?</DialogDescription>
        </DialogHeader>

        <Separator />

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="e.g. Daily exercise" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" name="description" rows={2} placeholder="Any extra context…" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setType(option.value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-4 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="type" value={type} />
          </div>

          {type !== "MILESTONE" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="columnId">Column</Label>
              <Select name="columnId" value={columnId} onValueChange={setColumnId}>
                <SelectTrigger id="columnId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "NUMERIC" && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="targetValue">Target value</Label>
                <Input id="targetValue" name="targetValue" type="number" step="any" placeholder="2" />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="targetUnit">Unit</Label>
                <Input id="targetUnit" name="targetUnit" placeholder="liters" />
              </div>
            </div>
          )}

          {type === "MILESTONE" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetDate">Target date</Label>
              <Input id="targetDate" name="targetDate" type="date" />
            </div>
          )}

          {type !== "MILESTONE" && (
            <div className="flex flex-col gap-2">
              <Label>Active days</Label>
              <div className="flex flex-wrap gap-3">
                {WEEKDAYS.map((day) => (
                  <label
                    key={day.value}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <Checkbox name={`weekday-${day.value}`} defaultChecked value="on" />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Adding…" : "Add goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
