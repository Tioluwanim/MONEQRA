import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function EmptyState({ title = "Nothing here yet", detail = "There is nothing to show for now." }: { title?: string; detail?: string }) {
  return (
    <div role="status" className="card-soft flex flex-col items-center gap-2 px-6 py-10 text-center">
      <Inbox aria-hidden="true" className="size-7 text-[var(--text-faint)]" />
      <strong className="text-base">{title}</strong>
      <span className="max-w-md text-sm text-[var(--text-muted)]">{detail}</span>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  detail = "Please try again in a moment.",
  onRetry,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="callout callout-bad items-start">
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--bad)]" />
      <div className="min-w-0 flex-1">
        <strong className="block">{title}</strong>
        <span className="text-sm text-[var(--text-muted)]">{detail}</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm mt-3">
            <RefreshCw aria-hidden="true" className="size-3.5" /> Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}
