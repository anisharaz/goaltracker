import { Spinner } from "@/components/ui/spinner";

export function RouteLoading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
