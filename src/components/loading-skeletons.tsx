import { FolderKanban } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

function SidebarSkeleton() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <FolderKanban className="h-5 w-5 text-sidebar-primary" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="ml-auto h-8 w-8 rounded-md" />
      </div>

      <div className="flex items-center gap-2 px-3 py-3">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>

      <div className="space-y-2 px-2 py-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
        ))}
      </div>
    </aside>
  )
}

function HeaderSkeleton() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b px-4">
      <Skeleton className="h-8 w-8 rounded-full" />
    </header>
  )
}

export function KanbanBoardSkeleton() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-5 w-20" />
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {Array.from({ length: 3 }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            className="flex h-full w-[22rem] shrink-0 flex-col rounded-xl border bg-card"
          >
            <div className="flex items-center gap-2 border-b px-3 py-3">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-8 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>

            <div className="space-y-2 px-2 py-2">
              {Array.from({ length: columnIndex === 1 ? 4 : 3 }).map((_, taskIndex) => (
                <div key={taskIndex} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start gap-2">
                    <Skeleton className="mt-0.5 h-4 w-4 rounded-sm" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto border-t px-2 py-2">
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          </div>
        ))}

        <Skeleton className="h-10 w-[22rem] shrink-0 rounded-md" />
      </div>
    </div>
  )
}

export function AppShellSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarSkeleton />
      <main className="flex flex-1 flex-col overflow-hidden">
        <HeaderSkeleton />
        <KanbanBoardSkeleton />
      </main>
    </div>
  )
}
