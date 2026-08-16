"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";

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

export function CreateGoalForm() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<GoalType>("HABIT");
  const [isSubmitting, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await createGoal(formData);
      formRef.current?.reset();
      setType("HABIT");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add goal
        </Button>
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
            <Label htmlFor="type">Type</Label>
            <Select name="type" value={type} onValueChange={(v) => setType(v as GoalType)}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HABIT">Habit (done / not done)</SelectItem>
                <SelectItem value="NUMERIC">Numeric (track a quantity)</SelectItem>
                <SelectItem value="MILESTONE">Milestone (one-off, target date)</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
