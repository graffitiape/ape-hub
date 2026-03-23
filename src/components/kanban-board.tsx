import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { Plus, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { KanbanColumn } from "@/components/kanban-column"
import { TaskCard } from "@/components/task-card"
import {
  useActiveProject,
  useProjectColumns,
  useKanbanStore,
  addColumn,
  moveTask,
  reorderTasks,
} from "@/stores/kanban-store"
import type { Task } from "@/types/kanban"

export function KanbanBoard() {
  const activeProject = useActiveProject()
  const columns = useProjectColumns(activeProject?.id ?? null)
  const { tasks } = useKanbanStore()
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState("")
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  if (!activeProject) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-3">
          <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Select or create a project to get started</p>
        </div>
      </div>
    )
  }

  function handleAddColumn() {
    const title = newColumnTitle.trim()
    if (!title || !activeProject) return
    addColumn(activeProject.id, title)
    setNewColumnTitle("")
    setAddingColumn(false)
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    if (active.data.current?.type === "task") {
      setActiveTask(active.data.current.task)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || !active.data.current) return

    const activeData = active.data.current
    if (activeData.type !== "task") return

    const activeTask = activeData.task as Task
    let overColumnId: string

    if (over.data.current?.type === "column") {
      overColumnId = over.id as string
    } else if (over.data.current?.type === "task") {
      overColumnId = (over.data.current.task as Task).columnId
    } else {
      return
    }

    if (activeTask.columnId !== overColumnId) {
      const overTasks = tasks.filter((t) => t.columnId === overColumnId).sort((a, b) => a.order - b.order)
      const newOrder = overTasks.length
      moveTask(activeTask.id, overColumnId, newOrder)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)

    if (!over || active.id === over.id) return

    const activeData = active.data.current
    const overData = over.data.current

    if (activeData?.type === "task" && overData?.type === "task") {
      const overTask = overData.task as Task
      const columnId = overTask.columnId
      const columnTasks = tasks
        .filter((t) => t.columnId === columnId)
        .sort((a, b) => a.order - b.order)
      const taskIds = columnTasks.map((t) => t.id)
      const oldIndex = taskIds.indexOf(active.id as string)
      const newIndex = taskIds.indexOf(over.id as string)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(taskIds, oldIndex, newIndex)
        reorderTasks(columnId, newOrder)
      }
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Board header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <h2 className="text-xl font-semibold">{activeProject.name}</h2>
        <span className="text-sm text-muted-foreground">
          {columns.length} column{columns.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Columns */}
      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {columns.map((col) => (
            <KanbanColumn key={col.id} column={col} />
          ))}

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>

        {/* Add column */}
        <div className="w-72 shrink-0">
          {addingColumn ? (
            <div className="space-y-2 rounded-xl border bg-card p-3">
              <Input
                autoFocus
                placeholder="Column title..."
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn()
                  if (e.key === "Escape") setAddingColumn(false)
                }}
                className="h-8 text-sm"
              />
              <div className="flex gap-1">
                <Button size="sm" className="h-7 text-xs" onClick={handleAddColumn}>Add</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingColumn(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-10 border-dashed text-muted-foreground"
              onClick={() => setAddingColumn(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Column
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
