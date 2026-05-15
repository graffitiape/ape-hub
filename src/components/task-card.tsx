import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronDown, GripVertical, Pencil, Trash2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { updateTask, deleteTask, moveTaskToColumn } from "@/stores/kanban-store"
import type { Column, Task } from "@/types/kanban"
import { cn } from "@/lib/utils"

interface TaskCardProps {
  task: Task
  columns?: Column[]
  enableDrag?: boolean
}

export function TaskCardPreview({ task }: TaskCardProps) {
  return (
    <Card className="flex w-full max-w-full items-start gap-2 p-3 shadow-lg">
      <div className="mt-0.5 shrink-0 text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="whitespace-pre-wrap break-words text-sm font-medium leading-tight [overflow-wrap:anywhere]">
          {task.title}
        </p>
        {task.description ? (
          <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {task.description}
          </p>
        ) : null}
      </div>
    </Card>
  )
}

export function TaskCard({
  task,
  columns = [],
  enableDrag = true,
}: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description)
  const currentColumn = columns.find((column) => column.id === task.columnId)
  const canMoveStatus = columns.length > 1

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", task },
    disabled: !enableDrag,
  })

  const style = {
    transform: enableDrag ? CSS.Transform.toString(transform) : undefined,
    transition: enableDrag ? transition : undefined,
  }

  function handleSave() {
    updateTask(task.id, { title: editTitle.trim(), description: editDesc.trim() })
    setEditOpen(false)
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        {...(enableDrag ? attributes : {})}
        {...(enableDrag ? listeners : {})}
        aria-label={enableDrag ? `Drag task ${task.title}` : `Task ${task.title}`}
        className={cn(
          "group w-full max-w-full p-3",
          enableDrag
            ? "touch-none cursor-grab active:cursor-grabbing"
            : "touch-pan-y cursor-default",
          isDragging && "opacity-50 shadow-lg"
        )}
      >
        <div className="flex items-start gap-2">
          <div className="mt-0.5 hidden shrink-0 text-muted-foreground group-hover:text-foreground md:block">
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="whitespace-pre-wrap break-words text-sm font-medium leading-tight [overflow-wrap:anywhere]">
              {task.title}
            </p>
            {task.description && (
              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                {task.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-6 md:w-6"
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onClick={() => {
                setEditTitle(task.title)
                setEditDesc(task.description)
                setEditOpen(true)
              }}
            >
              <Pencil className="h-3.5 w-3.5 md:h-3 md:w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive md:h-6 md:w-6"
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onClick={() => deleteTask(task.id)}
            >
              <Trash2 className="h-3.5 w-3.5 md:h-3 md:w-3" />
            </Button>
          </div>
        </div>

        {canMoveStatus ? (
          <div className="mt-3 flex md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 min-w-0 flex-1 justify-between gap-2 text-xs"
                  onPointerDown={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <span className="min-w-0 truncate">
                    {currentColumn?.title ?? "Status"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-48"
              >
                {columns.map((column) => (
                  <DropdownMenuItem
                    key={column.id}
                    disabled={column.id === task.columnId}
                    onClick={(event) => {
                      event.stopPropagation()
                      moveTaskToColumn(task.id, column.id)
                    }}
                  >
                    {column.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <textarea
              placeholder="Description (optional)"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
