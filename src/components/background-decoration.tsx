export function BackgroundDecoration() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="animate-blob-pulse absolute -top-24 -left-20 size-72 rounded-full bg-primary/15 blur-3xl dark:bg-primary/10"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="animate-blob-pulse absolute top-1/3 -right-24 size-96 rounded-full bg-chart-3/15 blur-3xl dark:bg-chart-3/10"
        style={{ animationDelay: "2.5s" }}
      />
      <div
        className="animate-blob-pulse absolute bottom-0 left-1/4 size-80 rounded-full bg-chart-4/15 blur-3xl dark:bg-chart-4/10"
        style={{ animationDelay: "5s" }}
      />
    </div>
  );
}
