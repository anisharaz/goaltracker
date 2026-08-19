"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";

import { submitCheckIn } from "@/app/dashboard/actions";
import { toDateInputValue } from "@/lib/dates";
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
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const RATINGS = Array.from({ length: 10 }, (_, i) => i + 1);

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

export function BackfillCheckInDialog({
  goalId,
  goalType,
  targetUnit,
}: {
  goalId: string;
  goalType: "HABIT" | "NUMERIC";
  targetUnit: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => toDateInputValue(yesterday()));
  const [note, setNote] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const pendingStreakRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPending && pendingStreakRef.current !== null) {
      celebrateCheckIn(pendingStreakRef.current);
      pendingStreakRef.current = null;
    }
  }, [isPending]);

  function resetForm() {
    setDate(toDateInputValue(yesterday()));
    setNote("");
    setRating(null);
    setValue("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await submitCheckIn({
        goalId,
        date,
        note: note || undefined,
        rating: rating ?? undefined,
        value: goalType === "NUMERIC" && value ? Number(value) : undefined,
      });
      if (result.streakIncreased) {
        pendingStreakRef.current = result.currentStreak;
      }
      startTransition(() => {
        router.refresh();
        setOpen(false);
        resetForm();
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History />
          Log a past day
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Log a past check-in</DialogTitle>
          <DialogDescription>Forgot to check in? Backfill an earlier day.</DialogDescription>
        </DialogHeader>

        <Separator />

        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="backfill-date">Date</Label>
            <Input
              id="backfill-date"
              type="date"
              value={date}
              max={toDateInputValue(new Date())}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {goalType === "NUMERIC" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="backfill-value">Value {targetUnit ? `(${targetUnit})` : ""}</Label>
              <Input
                id="backfill-value"
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="backfill-note">Note (optional)</Label>
            <Textarea
              id="backfill-note"
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
              {isPending && <Spinner />}
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
