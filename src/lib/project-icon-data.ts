import {
  Briefcase,
  CalendarDays,
  Code2,
  Compass,
  FolderKanban,
  Gem,
  Globe2,
  House,
  Lightbulb,
  Rocket,
  Settings2,
  Ship,
  Star,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react"

export const DEFAULT_PROJECT_ICON = "folder-kanban"
export const DEFAULT_PROJECT_COLOR = "#64748b"

export const projectIconOptions = [
  { name: "folder-kanban", label: "Board", icon: FolderKanban },
  { name: "briefcase", label: "Work", icon: Briefcase },
  { name: "rocket", label: "Launch", icon: Rocket },
  { name: "target", label: "Target", icon: Target },
  { name: "lightbulb", label: "Idea", icon: Lightbulb },
  { name: "code", label: "Code", icon: Code2 },
  { name: "calendar", label: "Calendar", icon: CalendarDays },
  { name: "compass", label: "Compass", icon: Compass },
  { name: "globe", label: "Global", icon: Globe2 },
  { name: "home", label: "Home", icon: House },
  { name: "ship", label: "Ship", icon: Ship },
  { name: "gem", label: "Gem", icon: Gem },
  { name: "settings", label: "Settings", icon: Settings2 },
  { name: "star", label: "Star", icon: Star },
  { name: "trophy", label: "Trophy", icon: Trophy },
] as const

export const projectColorOptions = [
  "#64748b",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#78716c",
]

const projectIconMap = new Map<string, LucideIcon>(
  projectIconOptions.map((option) => [option.name, option.icon])
)

export function getProjectIcon(iconName?: string): LucideIcon {
  return projectIconMap.get(iconName ?? "") ?? FolderKanban
}
