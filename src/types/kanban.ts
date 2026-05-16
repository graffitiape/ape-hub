import type { Project, Column, Task } from "../../shared/types"

export type { User, Project, Column, Task, BoardData } from "../../shared/types"

export interface KanbanState {
  projects: Project[]
  columns: Column[]
  tasks: Task[]
  activeProjectId: string | null
  loading: boolean
  projectsLoaded: boolean
  boardLoadedProjectId: string | null
  error: string | null
}
