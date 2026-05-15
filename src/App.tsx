import { useEffect, useRef } from "react"
import { useIsAuthenticated } from "@azure/msal-react"
import { ProjectSidebar } from "@/components/project-sidebar"
import { KanbanBoard } from "@/components/kanban-board"
import { LoginPage } from "@/components/login-page"
import { AppShellSkeleton } from "@/components/loading-skeletons"
import { UserMenu } from "@/components/user-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getPreferredAuthProvider } from "@/lib/auth-provider"
import { useGoogleAuth } from "@/lib/google-auth"
import { clearKanbanState, loadProjects, useKanbanStore } from "@/stores/kanban-store"

export default function App() {
  const isMicrosoftAuthenticated = useIsAuthenticated()
  const googleAuth = useGoogleAuth()
  const { loading, projects } = useKanbanStore()
  const previousAuthProvider = useRef<string | null>(null)
  const preferredProvider = getPreferredAuthProvider()
  const isGoogleActive =
    googleAuth.isAuthenticated &&
    (preferredProvider === "google" || !isMicrosoftAuthenticated)
  const activeAuthProvider = isGoogleActive
    ? "google"
    : isMicrosoftAuthenticated
      ? "microsoft"
      : null

  useEffect(() => {
    if (!activeAuthProvider) {
      previousAuthProvider.current = null
      clearKanbanState()
      return
    }

    if (
      previousAuthProvider.current &&
      previousAuthProvider.current !== activeAuthProvider
    ) {
      clearKanbanState()
    }

    previousAuthProvider.current = activeAuthProvider
    void loadProjects()
  }, [activeAuthProvider])

  return (
    <TooltipProvider>
      {!activeAuthProvider ? (
        <LoginPage />
      ) : loading && projects.length === 0 ? (
        <AppShellSkeleton />
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
