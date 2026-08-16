"use client";

import { useState, useTransition } from "react";

import { submitCheckIn } from "@/app/dashboard/actions";
import { celebrateCheckIn } from "@/lib/confetti";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const RATINGS = Array.from({ length: 10 }, (_, i) => i + 1);

export function CheckInDialog({
  goalId,
  goalType,
  targetUnit,
  alreadyCompletedToday,
  initialNote,
  initialRating,
  initialValue,
}: {
  goalId: string;
  goalType: "HABIT" | "NUMERIC" | "MILESTONE";
  targetUnit: string | null;
  alreadyCompletedToday: boolean;
  initialNote: string | null;
  initialRating: number | null;
  initialValue: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(initialNote ?? "");
  const [rating, setRating] = useState<number | null>(initialRating);
  const [value, setValue] = useState(initialValue?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await submitCheckIn({
        goalId,
        note: note || undefined,
        rating: rating ?? undefined,
        value: goalType === "NUMERIC" && value ? Number(value) : undefined,
      });
      setOpen(false);
      if (result.streakIncreased) {
        celebrateCheckIn(result.currentStreak);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={alreadyCompletedToday ? "outline" : "default"}>
          {alreadyCompletedToday ? "Edit today's check-in" : "Mark done"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Check in for today</DialogTitle>
          <DialogDescription>
            Log an optional note and rate how effectively you did it.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          {goalType === "NUMERIC" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="value">Value {targetUnit ? `(${targetUnit})` : ""}</Label>
              <Input
                id="value"
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="How did it go?"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Effectiveness (optional){rating ? ` — ${rating}/10` : ""}</Label>
            <div className="flex flex-wrap gap-1.5">
              {RATINGS.map((r) => (
                <Button
                  type="button"
                  key={r}
                  size="icon-sm"
                  variant={rating === r ? "default" : "outline"}
                  className={cn("rounded-full", rating === r && "border-transparent")}
                  onClick={() => setRating(rating === r ? null : r)}
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
