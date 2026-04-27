import { Skeleton } from '../components/ui/Skeleton';

export default function AuthLoading() {
  return (
    <div className="loading-shell">
      <div className="flex min-h-screen">
        <aside className="loading-sidebar">
          <div className="mb-6 flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-4 w-28 rounded-full" />
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton className="h-12 rounded-xl" key={index} />
            ))}
          </div>
        </aside>
        <div className="flex-1 p-4 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32 rounded-full" />
              <Skeleton className="h-9 w-56 rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24 rounded-xl" />
              <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
          </div>
          <div className="loading-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton className="h-40 rounded-2xl" key={index} />
            ))}
          </div>
          <div className="mt-6 space-y-4">
            <Skeleton className="h-52 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
