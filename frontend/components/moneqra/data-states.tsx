import { Skeleton } from "@/components/ui/skeleton";

export function EmptyState({ title = "Nothing recorded", detail = "No matching ledger entries." }: { title?: string; detail?: string }) {
  return (
    <div role="status" className="border-y border-[var(--ledger-rule)] py-8 text-center">
      <strong className="block">{title}</strong>
      <span className="text-sm text-[var(--ink-muted)]">{detail}</span>
    </div>
  );
}

export function ErrorState({ title = "Could not read this ledger", detail = "Retry the provider status check." }: { title?: string; detail?: string }) {
  return (
    <div role="alert" className="border-l-4 border-[var(--vermilion)] bg-[color-mix(in_srgb,var(--vermilion)_8%,var(--paper))] p-4">
      <strong className="block">{title}</strong>
      <span className="text-sm">{detail}</span>
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
