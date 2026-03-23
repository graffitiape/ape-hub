import { useState } from "react"
import { Plus, Trash2, FolderKanban, MoreHorizontal, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  useKanbanStore,
  addProject,
  renameProject,
  deleteProject,
  setActiveProject,
} from "@/stores/kanban-store"
import { cn } from "@/lib/utils"

export function ProjectSidebar() {
  const { projects, activeProjectId } = useKanbanStore()
  const [newName, setNewName] = useState("")
  const [renameDialog, setRenameDialog] = useState<{ id: string; name: string } | null>(null)

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    addProject(name)
    setNewName("")
  }

  function handleRename() {
    if (!renameDialog) return
    const name = renameDialog.name.trim()
    if (!name) return
    renameProject(renameDialog.id, name)
    setRenameDialog(null)
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4">
        <FolderKanban className="h-5 w-5 text-sidebar-primary" />
        <h1 className="text-lg font-semibold">Ape Hub</h1>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      <Separator />

      <div className="flex items-center gap-2 px-3 py-3">
        <Input
          placeholder="New project..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="h-8 text-sm"
        />
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-1">
          {projects.map((project) => (
            <div
              key={project.id}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
                project.id === activeProjectId
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
              )}
              onClick={() => setActiveProject(project.id)}
            >
              <FolderKanban className="h-4 w-4 shrink-0 opacity-60" />
              <span className="truncate flex-1">{project.name}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setRenameDialog({ id: project.id, name: project.name })}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => deleteProject(project.id)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No projects yet. Create one above.
            </p>
          )}
        </div>
      </ScrollArea>

      <Dialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <Input
            value={renameDialog?.name ?? ""}
            onChange={(e) => renameDialog && setRenameDialog({ ...renameDialog, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>Cancel</Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
