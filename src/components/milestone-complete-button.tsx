"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { toggleMilestoneComplete } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function MilestoneCompleteButton({
  goalId,
  completed,
}: {
  goalId: string;
  completed: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      await toggleMilestoneComplete(goalId);
      startTransition(() => {
        router.refresh();
      });
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={completed ? "outline" : "default"}
      disabled={isPending}
      onClick={handleClick}
      className={cn(
        completed &&
          "border-[color-mix(in_oklch,var(--chart-3)_40%,transparent)] text-[color:var(--chart-3)] hover:text-[color:var(--chart-3)]",
      )}
    >
      {isPending ? <Spinner /> : completed && <Check className="size-3.5" />}
      {isPending ? "Saving…" : completed ? "Completed" : "Mark complete"}
    </Button>
  );
}
