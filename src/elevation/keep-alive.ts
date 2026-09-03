// Keep-alive scheduling for the Linux/macOS sudo credential during an apply phase (§15) — the
// same shape as the current script.sh's `sudo -n true; sleep 60` background loop, generalized so
// it's independently testable (via @std/testing's FakeTime, not real waiting) and stoppable.

export interface KeepAliveHandle {
  stop(): void;
}

/** Calls `refresh` immediately, then again every `intervalMs`, until `stop()` is called. */
export function startKeepAlive(
  refresh: () => void | Promise<void>,
  intervalMs: number,
): KeepAliveHandle {
  refresh();
  const timer = setInterval(refresh, intervalMs);
  return { stop: () => clearInterval(timer) };
}
