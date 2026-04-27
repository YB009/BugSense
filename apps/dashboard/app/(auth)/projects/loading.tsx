export default function ProjectsLoading() {
  return (
    <div className="space-y-6 p-2">
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted/60" />
        <div className="h-10 w-56 animate-pulse rounded bg-muted/60" />
        <div className="h-5 w-[30rem] max-w-full animate-pulse rounded bg-muted/60" />
      </div>
      <div className="h-14 animate-pulse rounded-2xl border border-border bg-panel/70" />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="h-56 animate-pulse rounded-2xl border border-border bg-panel/70" />
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-panel/70" />
        </div>
        <div className="h-[32rem] animate-pulse rounded-2xl border border-border bg-panel/70" />
      </div>
    </div>
  );
}
