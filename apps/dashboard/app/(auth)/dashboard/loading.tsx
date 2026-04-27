export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-2">
      <div className="space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-muted/60" />
        <div className="h-10 w-64 animate-pulse rounded bg-muted/60" />
        <div className="h-5 w-[28rem] max-w-full animate-pulse rounded bg-muted/60" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            className="h-40 animate-pulse rounded-2xl border border-border bg-panel/70"
            key={index}
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-panel/70" />
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-panel/70" />
      </div>
      <div className="h-96 animate-pulse rounded-2xl border border-border bg-panel/70" />
    </div>
  );
}
