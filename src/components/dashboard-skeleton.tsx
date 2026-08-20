import { BackgroundDecoration } from "@/components/background-decoration";
import { BoardSkeleton } from "@/components/board-skeleton";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-muted/40">
      <BackgroundDecoration />
      <div className="flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:gap-12 sm:px-8 sm:py-20">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </header>

        <Separator />

        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-7 w-28" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-40 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>

          <BoardSkeleton />
        </section>
      </div>
    </div>
  );
}
