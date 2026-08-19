"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { archiveGoal, deleteGoal, unarchiveGoal, updateGoal } from "@/app/dashboard/actions";
import { toDateInputValue } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export type EditableGoal = {
  id: string;
  title: string;
  description: string | null;
  type: "HABIT" | "NUMERIC" | "MILESTONE";
  recurrenceType: "RECURRING" | "MONTHLY" | "NONE";
  targetValue: number | null;
  targetUnit: string | null;
  targetDate: Date | null;
  activeWeekdays: number[];
};

export function GoalActionsMenu({
  goal,
  redirectTo,
  isArchived = false,
}: {
  goal: EditableGoal;
  redirectTo?: string;
  isArchived?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isArchiving, startArchiveTransition] = useTransition();
  const router = useRouter();

  function handleArchiveToggle() {
    startArchiveTransition(async () => {
      if (isArchived) {
        await unarchiveGoal(goal.id);
      } else {
        await archiveGoal(goal.id);
      }
      startArchiveTransition(() => {
        router.refresh();
      });
    });
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSaveTransition(async () => {
      await updateGoal(goal.id, formData);
      startSaveTransition(() => {
        router.refresh();
        setEditOpen(false);
      });
    });
  }

  function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    startDeleteTransition(async () => {
      await deleteGoal(goal.id);
      startDeleteTransition(() => {
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
          setDeleteOpen(false);
        }
      });
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`More actions for ${goal.title}`}
            className="shrink-0 text-muted-foreground"
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleArchiveToggle} disabled={isArchiving}>
            {isArchived ? <ArchiveRestore /> : <Archive />}
            {isArchived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit goal</DialogTitle>
            <DialogDescription>Update the details for &quot;{goal.title}&quot;.</DialogDescription>
          </DialogHeader>

          <Separator />

          <form onSubmit={handleEditSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-title-${goal.id}`}>Title</Label>
              <Input id={`edit-title-${goal.id}`} name="title" required defaultValue={goal.title} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-description-${goal.id}`}>Description (optional)</Label>
              <Textarea
                id={`edit-description-${goal.id}`}
                name="description"
                rows={2}
                defaultValue={goal.description ?? ""}
              />
            </div>

            {goal.type === "NUMERIC" && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor={`edit-target-value-${goal.id}`}>Target value</Label>
                  <Input
                    id={`edit-target-value-${goal.id}`}
                    name="targetValue"
                    type="number"
                    step="any"
                    defaultValue={goal.targetValue ?? ""}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor={`edit-target-unit-${goal.id}`}>Unit</Label>
                  <Input
                    id={`edit-target-unit-${goal.id}`}
                    name="targetUnit"
                    defaultValue={goal.targetUnit ?? ""}
                  />
                </div>
              </div>
            )}

            {goal.type === "MILESTONE" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`edit-target-date-${goal.id}`}>Target date</Label>
                <Input
                  id={`edit-target-date-${goal.id}`}
                  name="targetDate"
                  type="date"
                  defaultValue={goal.targetDate ? toDateInputValue(goal.targetDate) : ""}
                />
              </div>
            )}

            {goal.recurrenceType === "RECURRING" && (
              <div className="flex flex-col gap-2">
                <Label>Active days</Label>
                <div className="flex flex-wrap gap-3">
                  {WEEKDAYS.map((day) => (
                    <label
                      key={day.value}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground"
                    >
                      <Checkbox
                        name={`weekday-${day.value}`}
                        defaultChecked={goal.activeWeekdays.includes(day.value)}
                        value="on"
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Spinner />}
                {isSaving ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{goal.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the goal and all of its check-in history. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting && <Spinner />}
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
