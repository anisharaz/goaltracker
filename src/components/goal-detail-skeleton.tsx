import { BackgroundDecoration } from "@/components/background-decoration";
import { GoalStatsSkeleton } from "@/components/goal-stats-skeleton";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function GoalDetailSkeleton() {
  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-muted/40">
      <BackgroundDecoration />
      <div className="flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-12 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>

        <Separator />

        <GoalStatsSkeleton />
      </div>
    </div>
  );
}
