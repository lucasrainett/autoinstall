import type { HistoryRecord } from "./types.ts";

export interface HistorySummary {
  installed: HistoryRecord[];
  skipped: HistoryRecord[];
  failed: HistoryRecord[];
}

/**
 * Composable rather than "last run"-specific: pass `recordsForLastRun(all)` (store.ts) for an
 * end-of-run report, or the full history for the TUI's all-time history view — same primitive.
 */
export function summarizeHistory(records: readonly HistoryRecord[]): HistorySummary {
  return {
    installed: records.filter((r) => r.result === "success"),
    skipped: records.filter((r) => r.result === "skipped"),
    failed: records.filter((r) => r.result === "failed"),
  };
}
