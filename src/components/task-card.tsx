import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Pencil, Trash2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { updateTask, deleteTask } from "@/stores/kanban-store"
import type { Task } from "@/types/kanban"
import { cn } from "@/lib/utils"

interface TaskCardProps {
  task: Task
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

export function TaskCard({ task }: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
        {...attributes}
        {...listeners}
        aria-label={`Drag task ${task.title}`}
        className={cn(
          "group flex w-full max-w-full touch-none cursor-grab items-start gap-2 p-3 active:cursor-grabbing",
          isDragging && "opacity-50 shadow-lg"
        )}
      >
        <div className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-foreground">
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
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onClick={() => {
              setEditTitle(task.title)
              setEditDesc(task.description)
              setEditOpen(true)
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onClick={() => deleteTask(task.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
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
