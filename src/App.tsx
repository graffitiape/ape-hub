import { useEffect, useRef, useState } from "react"
import { useIsAuthenticated } from "@azure/msal-react"
import { FolderKanban, Menu } from "lucide-react"
import { ProjectSidebar } from "@/components/project-sidebar"
import { KanbanBoard } from "@/components/kanban-board"
import { LoginPage } from "@/components/login-page"
import { AppShellSkeleton } from "@/components/loading-skeletons"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getPreferredAuthProvider } from "@/lib/auth-provider"
import { useGoogleAuth } from "@/lib/google-auth"
import {
  clearKanbanState,
  loadProjects,
  useActiveProject,
  useKanbanStore,
} from "@/stores/kanban-store"

export default function App() {
  const isMicrosoftAuthenticated = useIsAuthenticated()
  const googleAuth = useGoogleAuth()
  const { loading, projects } = useKanbanStore()
  const activeProject = useActiveProject()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
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
        <div className="flex h-dvh overflow-hidden bg-background">
          <ProjectSidebar className="hidden md:flex" />
          <main className="flex flex-1 flex-col overflow-hidden">
            <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:h-16 sm:px-4">
              <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 md:hidden"
                    aria-label="Open projects"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[min(20rem,calc(100vw-2rem))] p-0"
                  showCloseButton={false}
                >
                  <ProjectSidebar
                    className="h-dvh w-full border-r-0"
                    onProjectSelect={() => setMobileSidebarOpen(false)}
                  />
                </SheetContent>
              </Sheet>
              <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
                <FolderKanban className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">Ape Hub</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {activeProject?.name ?? "Projects"}
                  </p>
                </div>
              </div>
              <div className="ml-auto">
                <UserMenu />
              </div>
            </header>
            <KanbanBoard />
          </main>
        </div>
      )}
    </TooltipProvider>
  )
}
