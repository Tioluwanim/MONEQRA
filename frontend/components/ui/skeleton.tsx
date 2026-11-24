import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-[var(--radius-xs)] bg-[var(--ledger-rule)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
