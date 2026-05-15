export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  createdAt: string
  lastLogin: string
}

export interface Project {
  id: string
  name: string
  userId: string
  isFavorite: boolean
  iconName: string
  iconColor: string
  createdAt: string
}

export interface Column {
  id: string
  title: string
  projectId: string
  order: number
}

export interface Task {
  id: string
  title: string
  description: string
  columnId: string
  order: number
  createdAt: string
}

export interface BoardData {
  project: Project
  columns: Column[]
  tasks: Task[]
}
