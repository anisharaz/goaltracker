"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

export function CreateMilestoneForm() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("type", "MILESTONE");
    startTransition(async () => {
      const goal = await createGoal(formData);
      startTransition(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("highlight", goal.id);
        router.push(url.pathname + url.search, { scroll: false });
        formRef.current?.reset();
        setOpen(false);
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Add milestone" className="shrink-0">
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New milestone</DialogTitle>
          <DialogDescription>A one-off goal with an optional target date.</DialogDescription>
        </DialogHeader>

        <Separator />

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="milestone-title">Title</Label>
            <Input id="milestone-title" name="title" required placeholder="e.g. Finish the course" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="milestone-target-date">Target date</Label>
            <Input id="milestone-target-date" name="targetDate" type="date" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Adding…" : "Add milestone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
