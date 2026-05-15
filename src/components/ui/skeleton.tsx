import type * as React from "react"
import { cn } from "@/lib/utils"

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "shimmer-skeleton rounded-md bg-muted",
        className
      )}
      {...props}
    />
  )
}
