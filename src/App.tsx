import { useEffect } from "react"
import { useIsAuthenticated } from "@azure/msal-react"
import { ProjectSidebar } from "@/components/project-sidebar"
import { KanbanBoard } from "@/components/kanban-board"
import { LoginPage } from "@/components/login-page"
import { UserMenu } from "@/components/user-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import { clearKanbanState, loadProjects } from "@/stores/kanban-store"

export default function App() {
  const isAuthenticated = useIsAuthenticated()

  useEffect(() => {
    if (!isAuthenticated) {
      clearKanbanState()
      return
    }

    void loadProjects()
  }, [isAuthenticated])

  return (
    <TooltipProvider>
      {!isAuthenticated ? (
        <LoginPage />
      ) : (
        <div className="flex h-screen overflow-hidden bg-background">
          <ProjectSidebar />
          <main className="flex flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center justify-end border-b px-4">
              <UserMenu />
            </header>
            <KanbanBoard />
          </main>
        </div>
      )}
    </TooltipProvider>
  )
}
