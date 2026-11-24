let startPromise: Promise<void> | null = null;

/**
 * Starts the MSW service worker once when the prototype runs in simulation
 * mode. API calls await this so they cannot race ahead of the worker.
 */
export function ensureMocksStarted(): Promise<void> {
  if (process.env.NEXT_PUBLIC_USE_MOCKS !== "true" || typeof window === "undefined") {
    return Promise.resolve();
  }
  if (!startPromise) {
    startPromise = import("@/mocks/browser").then(({ worker }) =>
      worker.start({ onUnhandledRequest: "bypass" }).then(() => undefined),
    );
  }
  return startPromise;
}
