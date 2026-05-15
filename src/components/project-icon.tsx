import { createElement } from "react"
import {
  DEFAULT_PROJECT_COLOR,
  getProjectIcon,
} from "@/lib/project-icon-data"

export function ProjectIcon({
  iconName,
  color,
  className,
}: {
  iconName?: string
  color?: string
  className?: string
}) {
  return createElement(getProjectIcon(iconName), {
    className,
    style: { color: color || DEFAULT_PROJECT_COLOR },
  })
}
