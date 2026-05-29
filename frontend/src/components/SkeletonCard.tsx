export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-3/4"></div>
        <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 rounded-full"></div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-full"></div>
        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-5/6"></div>
        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-4/6"></div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="h-8 bg-neutral-100 dark:bg-neutral-800 rounded w-24"></div>
        <div className="h-8 bg-neutral-100 dark:bg-neutral-800 rounded w-20"></div>
      </div>
    </div>
  )
}
