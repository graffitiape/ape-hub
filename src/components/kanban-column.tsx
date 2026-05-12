import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
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
import { TaskCard } from "@/components/task-card"
import { useColumnTasks, addTask, renameColumn, deleteColumn } from "@/stores/kanban-store"
import type { Column } from "@/types/kanban"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  column: Column
}

export function KanbanColumn({ column }: KanbanColumnProps) {
  const tasks = useColumnTasks(column.id)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [adding, setAdding] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameName, setRenameName] = useState(column.title)

  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column", column } })

  function handleAddTask() {
    const title = newTaskTitle.trim()
    if (!title) return
    addTask(column.id, title)
    setNewTaskTitle("")
    setAdding(false)
  }

  function handleRename() {
    const name = renameName.trim()
    if (!name) return
    renameColumn(column.id, name)
    setRenameOpen(false)
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-[22rem] shrink-0 flex-col rounded-xl border bg-card",
        isOver && "ring-2 ring-primary/40"
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b">
        <h3 className="text-sm font-semibold truncate flex-1">{column.title}</h3>
        <Badge variant="secondary" className="text-xs font-normal">{tasks.length}</Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setRenameName(column.title); setRenameOpen(true) }}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => deleteColumn(column.id)}>
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tasks */}
      <ScrollArea className="min-h-0 flex-1 px-2 py-2">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>

      {/* Add task */}
      <div className="border-t px-2 py-2">
        {adding ? (
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTask()
                if (e.key === "Escape") setAdding(false)
              }}
              className="h-8 text-sm"
            />
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs" onClick={handleAddTask}>Add</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-muted-foreground h-8"
            onClick={() => setAdding(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add task
          </Button>
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Column</DialogTitle>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
