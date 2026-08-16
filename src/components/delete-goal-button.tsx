"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteGoal } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

export function DeleteGoalButton({
  goalId,
  goalTitle,
  redirectTo,
}: {
  goalId: string;
  goalTitle: string;
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    // Prevent AlertDialogAction's default auto-close so the pending
    // spinner is actually visible while the delete is in flight.
    e.preventDefault();
    startTransition(async () => {
      await deleteGoal(goalId);
      // Keep the pending spinner up through the router refresh/navigation
      // so the dialog doesn't close (or the redirect fire) before the
      // updated list is actually ready.
      startTransition(() => {
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
          setOpen(false);
        }
      });
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Delete ${goalTitle}`}>
          <Trash2 className="text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{goalTitle}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the goal and all of its check-in history. This
            can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={handleDelete}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending && <Spinner />}
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
