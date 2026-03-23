import { useEffect } from "react"
import { ProjectSidebar } from "@/components/project-sidebar"
import { KanbanBoard } from "@/components/kanban-board"
import { UserMenu } from "@/components/user-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import { loadProjects } from "@/stores/kanban-store"

export default function App() {
  useEffect(() => {
    loadProjects()
  }, [])

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <ProjectSidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center justify-end border-b px-4 py-2">
            <UserMenu />
          </header>
          <KanbanBoard />
        </main>
      </div>
    </TooltipProvider>
  )
}
