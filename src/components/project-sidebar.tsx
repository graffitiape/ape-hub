import { useState } from "react"
import { Plus, Trash2, FolderKanban, MoreHorizontal, Pencil, Star, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  setProjectFavorite,
  setActiveProject,
  updateProjectIcon,
} from "@/stores/kanban-store"
import {
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
  projectColorOptions,
  projectIconOptions,
} from "@/lib/project-icon-data"
import { ProjectIcon } from "@/components/project-icon"
import { cn } from "@/lib/utils"
import type { Project } from "@/types/kanban"

type IconDialogState = Pick<Project, "id" | "name" | "iconName" | "iconColor">

function isValidHexColor(color: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color)
}

export function ProjectSidebar() {
  const { projects, activeProjectId } = useKanbanStore()
  const [newName, setNewName] = useState("")
  const [renameDialog, setRenameDialog] = useState<{ id: string; name: string } | null>(null)
  const [iconDialog, setIconDialog] = useState<IconDialogState | null>(null)

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

  function openIconDialog(project: Project) {
    setIconDialog({
      id: project.id,
      name: project.name,
      iconName: project.iconName || DEFAULT_PROJECT_ICON,
      iconColor: project.iconColor || DEFAULT_PROJECT_COLOR,
    })
  }

  function handleSaveIcon() {
    if (!iconDialog || !isValidHexColor(iconDialog.iconColor)) return

    updateProjectIcon(
      iconDialog.id,
      iconDialog.iconName,
      iconDialog.iconColor
    )
    setIconDialog(null)
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <FolderKanban className="h-5 w-5 text-sidebar-primary" />
        <h1 className="text-lg font-semibold">Ape Hub</h1>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

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
              <ProjectIcon
                iconName={project.iconName}
                color={project.iconColor}
                className="h-4 w-4 shrink-0"
              />
              <span className="min-w-0 flex-1 truncate">{project.name}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  project.isFavorite
                    ? `Unfavorite ${project.name}`
                    : `Favorite ${project.name}`
                }
                className={cn(
                  "h-6 w-6 shrink-0 transition-opacity",
                  project.isFavorite
                    ? "text-amber-500 opacity-100 hover:text-amber-500"
                    : "text-muted-foreground opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  setProjectFavorite(project.id, !project.isFavorite)
                }}
              >
                <Star
                  className={cn(
                    "h-3.5 w-3.5",
                    project.isFavorite && "fill-current"
                  )}
                />
              </Button>
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
                  <DropdownMenuItem
                    onClick={() => setProjectFavorite(project.id, !project.isFavorite)}
                  >
                    <Star
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        project.isFavorite && "fill-current text-amber-500"
                      )}
                    />
                    {project.isFavorite ? "Unfavorite" : "Favorite"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRenameDialog({ id: project.id, name: project.name })}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openIconDialog(project)}>
                    <Palette className="mr-2 h-3.5 w-3.5" />
                    Customize icon
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

      <Dialog open={!!iconDialog} onOpenChange={(open) => !open && setIconDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project Icon</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-3">
              <ProjectIcon
                iconName={iconDialog?.iconName}
                color={iconDialog?.iconColor}
                className="h-6 w-6 shrink-0"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {iconDialog?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {iconDialog?.iconColor}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {projectIconOptions.map((option) => (
                <Button
                  key={option.name}
                  type="button"
                  variant={iconDialog?.iconName === option.name ? "default" : "outline"}
                  size="icon"
                  aria-label={option.label}
                  className="h-10 w-full"
                  onClick={() =>
                    iconDialog &&
                    setIconDialog({ ...iconDialog, iconName: option.name })
                  }
                >
                  <option.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-6 gap-2">
                {projectColorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    className={cn(
                      "h-8 rounded-md border transition-transform",
                      iconDialog?.iconColor.toLowerCase() === color.toLowerCase()
                        ? "scale-95 ring-2 ring-ring ring-offset-2 ring-offset-background"
                        : "hover:scale-95"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() =>
                      iconDialog &&
                      setIconDialog({ ...iconDialog, iconColor: color })
                    }
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={
                    isValidHexColor(iconDialog?.iconColor ?? "")
                      ? iconDialog?.iconColor
                      : DEFAULT_PROJECT_COLOR
                  }
                  aria-label="Project icon color"
                  className="h-9 w-10 shrink-0 rounded-md border bg-background p-1"
                  onChange={(event) =>
                    iconDialog &&
                    setIconDialog({
                      ...iconDialog,
                      iconColor: event.target.value,
                    })
                  }
                />
                <Input
                  value={iconDialog?.iconColor ?? ""}
                  onChange={(event) =>
                    iconDialog &&
                    setIconDialog({
                      ...iconDialog,
                      iconColor: event.target.value,
                    })
                  }
                  onKeyDown={(event) => event.key === "Enter" && handleSaveIcon()}
                  className="h-9 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIconDialog(null)}>Cancel</Button>
            <Button
              onClick={handleSaveIcon}
              disabled={!isValidHexColor(iconDialog?.iconColor ?? "")}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
