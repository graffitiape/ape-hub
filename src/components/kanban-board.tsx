import { useRef, useState } from "react"
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
  addColumn,
  getKanbanState,
  moveTaskLocally,
  persistTaskMove,
  persistTaskOrder,
  reorderTasksLocally,
  replaceTasks,
} from "@/stores/kanban-store"
import type { Task } from "@/types/kanban"

type DragSnapshot = {
  taskId: string
  columnId: string
  tasks: Task[]
}

type DropTarget = {
  columnId: string
  index: number
}

function sortByOrder(a: Task, b: Task) {
  return a.order - b.order
}

function getOrderedTaskIds(columnId: string) {
  return getKanbanState()
    .tasks
    .filter((task) => task.columnId === columnId)
    .sort(sortByOrder)
    .map((task) => task.id)
}

export function KanbanBoard() {
  const activeProject = useActiveProject()
  const columns = useProjectColumns(activeProject?.id ?? null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState("")
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const dragSnapshot = useRef<DragSnapshot | null>(null)

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
    const currentTasks = getKanbanState().tasks
    const task = currentTasks.find((currentTask) => currentTask.id === event.active.id)
    if (task) {
      dragSnapshot.current = {
        taskId: task.id,
        columnId: task.columnId,
        tasks: currentTasks.map((currentTask) => ({ ...currentTask })),
      }
      setActiveTask(task)
    }
  }

  function getDropTarget(
    event: DragOverEvent | DragEndEvent,
    activeId: string
  ): DropTarget | null {
    const { over } = event
    if (!over) return null

    const currentTasks = getKanbanState().tasks
    const overType = over.data.current?.type

    if (overType === "column") {
      const columnId = over.id as string
      const columnTasks = currentTasks.filter(
        (task) => task.columnId === columnId && task.id !== activeId
      )
      return { columnId, index: columnTasks.length }
    }

    if (overType === "task") {
      const overTask = currentTasks.find((task) => task.id === over.id)
      if (!overTask) return null

      const columnTasks = currentTasks
        .filter((task) => task.columnId === overTask.columnId && task.id !== activeId)
        .sort(sortByOrder)
      const overIndex = columnTasks.findIndex((task) => task.id === overTask.id)

      return {
        columnId: overTask.columnId,
        index: overIndex >= 0 ? overIndex : columnTasks.length,
      }
    }

    return null
  }

  function handleDragOver(event: DragOverEvent) {
    const activeId = event.active.id as string
    const target = getDropTarget(event, activeId)
    if (!target) return

    const currentTask = getKanbanState().tasks.find((task) => task.id === activeId)
    const originalColumnId = dragSnapshot.current?.columnId
    if (
      currentTask &&
      (currentTask.columnId !== target.columnId ||
        (originalColumnId !== target.columnId && currentTask.order !== target.index))
    ) {
      moveTaskLocally(activeId, target.columnId, target.index)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = event.active.id as string
    const snapshot = dragSnapshot.current
    const target = getDropTarget(event, activeId)
    dragSnapshot.current = null
    setActiveTask(null)

    if (!snapshot || !target) {
      if (snapshot) replaceTasks(snapshot.tasks)
      return
    }

    const currentTasks = getKanbanState().tasks
    const currentTask = currentTasks.find((task) => task.id === activeId)
    const overTask = currentTasks.find((task) => task.id === event.over?.id)

    if (
      currentTask &&
      overTask &&
      snapshot.columnId === target.columnId &&
      currentTask.columnId === overTask.columnId
    ) {
      const orderedIds = getOrderedTaskIds(currentTask.columnId)
      const oldIndex = orderedIds.indexOf(activeId)
      const newIndex = orderedIds.indexOf(overTask.id)

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderTasksLocally(
          currentTask.columnId,
          arrayMove(orderedIds, oldIndex, newIndex)
        )
      }
    } else {
      moveTaskLocally(activeId, target.columnId, target.index)
    }

    const finalTasks = getKanbanState().tasks
    const finalTask = finalTasks.find((task) => task.id === activeId)
    if (!finalTask) {
      replaceTasks(snapshot.tasks)
      return
    }

    const touchedColumnIds = new Set([snapshot.columnId, finalTask.columnId])

    try {
      if (snapshot.columnId !== finalTask.columnId) {
        await persistTaskMove(activeId, finalTask.columnId, finalTask.order)
      }

      await Promise.all(
        [...touchedColumnIds].map((columnId) =>
          persistTaskOrder(columnId, getOrderedTaskIds(columnId))
        )
      )
    } catch (err) {
      console.error(err)
      replaceTasks(snapshot.tasks)
    }
  }

  function handleDragCancel() {
    if (dragSnapshot.current) {
      replaceTasks(dragSnapshot.current.tasks)
      dragSnapshot.current = null
    }
    setActiveTask(null)
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
          onDragCancel={handleDragCancel}
        >
          {columns.map((col) => (
            <KanbanColumn key={col.id} column={col} />
          ))}

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>

        {/* Add column */}
        <div className="w-[22rem] shrink-0">
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
