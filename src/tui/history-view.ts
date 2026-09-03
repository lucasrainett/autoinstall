// History viewer logic — TASKS.md §2, building on §1.6's history module. Groups records by run
// (a run is meaningful to review as a unit — "what happened when I ran this on Jan 1") and sorts
// runs newest-first; filtering by result happens before grouping, so a run with zero matching
// records after filtering simply doesn't appear, rather than showing an empty group.

import type { HistoryRecord, HistoryResult } from "../history/types.ts";

export type HistoryFilter = "all" | HistoryResult;

export interface HistoryViewRun {
  runId: string;
  /** The run's own timestamp — its first record's, since a run's records share one run start. */
  timestamp: string;
  records: HistoryRecord[];
}

export function filterHistoryRecords(
  records: readonly HistoryRecord[],
  filter: HistoryFilter,
): HistoryRecord[] {
  if (filter === "all") return [...records];
  return records.filter((r) => r.result === filter);
}

export function buildHistoryView(
  records: readonly HistoryRecord[],
  filter: HistoryFilter = "all",
): HistoryViewRun[] {
  const filtered = filterHistoryRecords(records, filter);

  const byRun = new Map<string, HistoryRecord[]>();
  for (const record of filtered) {
    const group = byRun.get(record.runId);
    if (group) group.push(record);
    else byRun.set(record.runId, [record]);
  }

  const runs: HistoryViewRun[] = [...byRun.entries()].map(([runId, recs]) => ({
    runId,
    timestamp: recs[0].timestamp,
    records: recs,
  }));

  runs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // newest first; ISO 8601 sorts lexicographically
  return runs;
}
