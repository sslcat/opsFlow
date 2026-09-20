import { Card } from "@/components/ui"

export default function Loading() {
  return (
    <div role="status" aria-label="Loading workspace" className="space-y-6">
      <span className="sr-only">Loading your workspace…</span>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item} className="h-36 animate-pulse bg-slate-50" />
        ))}
      </div>
      <Card className="h-64 animate-pulse bg-slate-50" />
    </div>
  )
}
