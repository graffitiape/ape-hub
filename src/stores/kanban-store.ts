import { useSyncExternalStore } from "react"
import type { KanbanState, Project, Column, Task, BoardData } from "@/types/kanban"
import { api } from "@/lib/api-client"
import { DEFAULT_PROJECT_COLOR, DEFAULT_PROJECT_ICON } from "@/lib/project-icon-data"
import { nanoid } from "nanoid"

const ACTIVE_PROJECT_KEY = "ape-hub-active-project"

let state: KanbanState = {
  projects: [],
  columns: [],
  tasks: [],
  activeProjectId: localStorage.getItem(ACTIVE_PROJECT_KEY),
  loading: false,
  error: null,
}

const listeners = new Set<() => void>()
let storeVersion = 0
let projectsLoadVersion = 0
let boardLoadVersion = 0

function sortProjects(projects: Project[]) {
  return [...projects].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

function emit() {
  listeners.forEach((l) => l())
}

function setState(next: KanbanState) {
  state = next
  emit()
}

function getSnapshot() {
  return state
}

export function getKanbanState() {
  return state
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function clearKanbanState() {
  storeVersion += 1
  projectsLoadVersion += 1
  boardLoadVersion += 1
  localStorage.removeItem(ACTIVE_PROJECT_KEY)
  setState({
    projects: [],
    columns: [],
    tasks: [],
    activeProjectId: null,
    loading: false,
    error: null,
  })
}

// --- Data Loading ---

export async function loadProjects() {
  const requestVersion = ++projectsLoadVersion
  const currentStoreVersion = storeVersion
  setState({ ...state, loading: true, error: null })
  try {
    const projects = await api.get<Project[]>("/projects")
    if (
      requestVersion !== projectsLoadVersion ||
      currentStoreVersion !== storeVersion
    ) {
      return
    }

    setState({ ...state, projects: sortProjects(projects), loading: false })

    // If active project no longer exists, pick the first one
    if (state.activeProjectId && !projects.find((p) => p.id === state.activeProjectId)) {
      const newActive = projects[0]?.id ?? null
      setActiveProject(newActive)
    } else if (!state.activeProjectId && projects.length > 0) {
      setActiveProject(projects[0].id)
    } else if (state.activeProjectId) {
      await loadBoard(state.activeProjectId)
    }
  } catch (err) {
    if (
      requestVersion !== projectsLoadVersion ||
      currentStoreVersion !== storeVersion
    ) {
      return
    }

    setState({ ...state, loading: false, error: (err as Error).message })
  }
}

export async function loadBoard(projectId: string) {
  const requestVersion = ++boardLoadVersion
  const currentStoreVersion = storeVersion
  setState({ ...state, loading: true, error: null })
  try {
    const board = await api.get<BoardData>(`/projects/${projectId}/board`)
    if (
      requestVersion !== boardLoadVersion ||
      currentStoreVersion !== storeVersion ||
      state.activeProjectId !== projectId
    ) {
      return
    }

    setState({
      ...state,
      columns: [
        ...state.columns.filter((c) => c.projectId !== projectId),
        ...board.columns,
      ],
      tasks: [
        ...state.tasks.filter(
          (t) => !board.columns.some((c) => c.id === t.columnId)
        ),
        ...board.tasks,
      ],
      loading: false,
    })
  } catch (err) {
    if (
      requestVersion !== boardLoadVersion ||
      currentStoreVersion !== storeVersion ||
      state.activeProjectId !== projectId
    ) {
      return
    }

    setState({ ...state, loading: false, error: (err as Error).message })
  }
}

// --- Project Actions ---

export async function addProject(name: string) {
  const tempId = nanoid()
  const optimistic: Project = {
    id: tempId,
    name,
    userId: "",
    isFavorite: false,
    iconName: DEFAULT_PROJECT_ICON,
    iconColor: DEFAULT_PROJECT_COLOR,
    createdAt: new Date().toISOString(),
  }
  const prev = state
  setState({
    ...state,
    projects: sortProjects([...state.projects, optimistic]),
    activeProjectId: tempId,
  })
  localStorage.setItem(ACTIVE_PROJECT_KEY, tempId)

  try {
    const created = await api.post<Project>("/projects", { name })
    setState({
      ...state,
      projects: sortProjects(
        state.projects.map((p) => (p.id === tempId ? created : p))
      ),
      activeProjectId: created.id,
      columns: [],
      tasks: [],
    })
    localStorage.setItem(ACTIVE_PROJECT_KEY, created.id)
  } catch {
    setState(prev)
    localStorage.setItem(ACTIVE_PROJECT_KEY, prev.activeProjectId ?? "")
  }
}

export async function renameProject(id: string, name: string) {
  const prev = state
  setState({
    ...state,
    projects: sortProjects(
      state.projects.map((p) => (p.id === id ? { ...p, name } : p))
    ),
  })

  try {
    await api.patch(`/projects/${id}`, { name })
  } catch {
    setState(prev)
  }
}

export async function setProjectFavorite(id: string, isFavorite: boolean) {
  const prev = state
  setState({
    ...state,
    projects: sortProjects(
      state.projects.map((p) => (p.id === id ? { ...p, isFavorite } : p))
    ),
  })

  try {
    const updated = await api.patch<Project>(`/projects/${id}`, { isFavorite })
    setState({
      ...state,
      projects: sortProjects(
        state.projects.map((p) => (p.id === id ? updated : p))
      ),
    })
  } catch {
    setState(prev)
  }
}

export async function updateProjectIcon(
  id: string,
  iconName: string,
  iconColor: string
) {
  const prev = state
  setState({
    ...state,
    projects: state.projects.map((p) =>
      p.id === id ? { ...p, iconName, iconColor } : p
    ),
  })

  try {
    const updated = await api.patch<Project>(`/projects/${id}`, {
      iconName,
      iconColor,
    })
    setState({
      ...state,
      projects: sortProjects(
        state.projects.map((p) => (p.id === id ? updated : p))
      ),
    })
  } catch {
    setState(prev)
  }
}

export async function deleteProject(id: string) {
  const prev = state
  const columnIds = state.columns.filter((c) => c.projectId === id).map((c) => c.id)
  const newActiveId =
    state.activeProjectId === id
      ? (state.projects.find((p) => p.id !== id)?.id ?? null)
      : state.activeProjectId

  setState({
    ...state,
    projects: state.projects.filter((p) => p.id !== id),
    columns: state.columns.filter((c) => c.projectId !== id),
    tasks: state.tasks.filter((t) => !columnIds.includes(t.columnId)),
    activeProjectId: newActiveId,
  })
  localStorage.setItem(ACTIVE_PROJECT_KEY, newActiveId ?? "")

  try {
    await api.delete(`/projects/${id}`)
    if (newActiveId) await loadBoard(newActiveId)
  } catch {
    setState(prev)
    localStorage.setItem(ACTIVE_PROJECT_KEY, prev.activeProjectId ?? "")
  }
}

export function setActiveProject(id: string | null) {
  boardLoadVersion += 1
  setState({ ...state, activeProjectId: id })
  localStorage.setItem(ACTIVE_PROJECT_KEY, id ?? "")
  if (id) loadBoard(id)
}

// --- Column Actions ---

export async function addColumn(projectId: string, title: string) {
  const prev = state
  const maxOrder = Math.max(
    0,
    ...state.columns.filter((c) => c.projectId === projectId).map((c) => c.order)
  )
  const tempId = nanoid()
  const optimistic: Column = { id: tempId, title, projectId, order: maxOrder + 1 }

  setState({ ...state, columns: [...state.columns, optimistic] })

  try {
    const created = await api.post<Column>(`/projects/${projectId}/columns`, {
      title,
    })
    setState({
      ...state,
      columns: state.columns.map((c) => (c.id === tempId ? created : c)),
    })
  } catch {
    setState(prev)
  }
}

export async function renameColumn(id: string, title: string) {
  const prev = state
  setState({
    ...state,
    columns: state.columns.map((c) => (c.id === id ? { ...c, title } : c)),
  })

  try {
    await api.patch(`/columns/${id}`, { title })
  } catch {
    setState(prev)
  }
}

export async function deleteColumn(id: string) {
  const prev = state
  setState({
    ...state,
    columns: state.columns.filter((c) => c.id !== id),
    tasks: state.tasks.filter((t) => t.columnId !== id),
  })

  try {
    await api.delete(`/columns/${id}`)
  } catch {
    setState(prev)
  }
}

export async function reorderColumns(projectId: string, orderedIds: string[]) {
  const prev = state
  setState({
    ...state,
    columns: state.columns.map((c) => {
      if (c.projectId !== projectId) return c
      const idx = orderedIds.indexOf(c.id)
      return idx >= 0 ? { ...c, order: idx } : c
    }),
  })

  try {
    await api.put(`/projects/${projectId}/columns/order`, { orderedIds })
  } catch {
    setState(prev)
  }
}

// --- Task Actions ---

export async function addTask(columnId: string, title: string, description = "") {
  const prev = state
  const maxOrder = Math.max(
    0,
    ...state.tasks.filter((t) => t.columnId === columnId).map((t) => t.order)
  )
  const tempId = nanoid()
  const optimistic: Task = {
    id: tempId,
    title,
    description,
    columnId,
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
  }

  setState({ ...state, tasks: [...state.tasks, optimistic] })

  try {
    const created = await api.post<Task>(`/columns/${columnId}/tasks`, {
      title,
      description,
    })
    setState({
      ...state,
      tasks: state.tasks.map((t) => (t.id === tempId ? created : t)),
    })
  } catch {
    setState(prev)
  }
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<Task, "title" | "description">>
) {
  const prev = state
  setState({
    ...state,
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })

  try {
    await api.patch(`/tasks/${id}`, updates)
  } catch {
    setState(prev)
  }
}

export async function deleteTask(id: string) {
  const prev = state
  setState({
    ...state,
    tasks: state.tasks.filter((t) => t.id !== id),
  })

  try {
    await api.delete(`/tasks/${id}`)
  } catch {
    setState(prev)
  }
}

export async function moveTask(
  taskId: string,
  toColumnId: string,
  newOrder: number
) {
  const prev = state
  setState({
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId ? { ...t, columnId: toColumnId, order: newOrder } : t
    ),
  })

  try {
    await api.put(`/tasks/${taskId}/move`, {
      columnId: toColumnId,
      order: newOrder,
    })
  } catch {
    setState(prev)
  }
}

export function replaceTasks(tasks: Task[]) {
  setState({ ...state, tasks })
}

export function moveTaskLocally(
  taskId: string,
  toColumnId: string,
  newOrder: number
) {
  const task = state.tasks.find((t) => t.id === taskId)
  if (!task) return

  const fromColumnId = task.columnId
  const sourceTasks = state.tasks
    .filter((t) => t.columnId === fromColumnId && t.id !== taskId)
    .sort((a, b) => a.order - b.order)
  const targetTasks =
    fromColumnId === toColumnId
      ? sourceTasks
      : state.tasks
          .filter((t) => t.columnId === toColumnId)
          .sort((a, b) => a.order - b.order)

  const targetIndex = Math.min(Math.max(newOrder, 0), targetTasks.length)
  targetTasks.splice(targetIndex, 0, { ...task, columnId: toColumnId })

  const updates = new Map<string, Task>()
  sourceTasks.forEach((sourceTask, index) => {
    updates.set(sourceTask.id, { ...sourceTask, order: index })
  })
  targetTasks.forEach((targetTask, index) => {
    updates.set(targetTask.id, {
      ...targetTask,
      columnId: toColumnId,
      order: index,
    })
  })

  setState({
    ...state,
    tasks: state.tasks.map((currentTask) => updates.get(currentTask.id) ?? currentTask),
  })
}

export function reorderTasksLocally(columnId: string, orderedIds: string[]) {
  setState({
    ...state,
    tasks: state.tasks.map((t) => {
      if (t.columnId !== columnId) return t
      const idx = orderedIds.indexOf(t.id)
      return idx >= 0 ? { ...t, order: idx } : t
    }),
  })
}

export async function persistTaskMove(
  taskId: string,
  toColumnId: string,
  newOrder: number
) {
  await api.put(`/tasks/${taskId}/move`, {
    columnId: toColumnId,
    order: newOrder,
  })
}

export async function persistTaskOrder(columnId: string, orderedIds: string[]) {
  await api.put(`/columns/${columnId}/tasks/order`, { orderedIds })
}

export async function reorderTasks(columnId: string, orderedIds: string[]) {
  const prev = state
  reorderTasksLocally(columnId, orderedIds)

  try {
    await persistTaskOrder(columnId, orderedIds)
  } catch {
    setState(prev)
  }
}

// --- Hooks ---

export function useKanbanStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useActiveProject() {
  const { projects, activeProjectId } = useKanbanStore()
  return projects.find((p) => p.id === activeProjectId) ?? null
}

export function useProjectColumns(projectId: string | null) {
  const { columns } = useKanbanStore()
  return columns
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.order - b.order)
}

export function useColumnTasks(columnId: string) {
  const { tasks } = useKanbanStore()
  return tasks
    .filter((t) => t.columnId === columnId)
    .sort((a, b) => a.order - b.order)
}
