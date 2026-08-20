import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export function BoardSkeleton({ count = 2 }: { count?: number }) {
  return (
    <ScrollArea className="w-full" type="always">
      <div className="flex gap-4 pb-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex min-h-[28rem] w-72 shrink-0 flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:w-80"
          >
            <div className="flex items-center gap-2 px-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
