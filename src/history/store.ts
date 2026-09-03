import { dirname } from "@std/path";
import type { HistoryRecord } from "./types.ts";

/** Real wrapper: appends one JSON line to the history file, creating it (and its parent
 * directory, e.g. `~/.config/autoinstall/` on a first-ever run) if absent. Confirmed the hard
 * way: `create: true` only creates the *file*, not missing parent directories — without the
 * mkdir here, a fresh machine's first-ever history write throws NotFound, which is a real crash
 * this project caught in production use (an unhandled rejection from this exact function killed
 * an interactive TUI session mid-raw-mode). */
export async function appendHistoryRecord(path: string, record: HistoryRecord): Promise<void> {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, JSON.stringify(record) + "\n", { append: true, create: true });
}

/**
 * Real wrapper: reads and parses every line. A missing file is empty history, not an error — the
 * first run of the tool has no history yet. A malformed individual line is skipped rather than
 * aborting the whole read, consistent with the tolerant-parsing approach used elsewhere (loader.ts,
 * scan.ts): one bad line shouldn't make the rest of the history unreadable.
 */
export async function readHistory(path: string): Promise<HistoryRecord[]> {
  let raw: string;
  try {
    raw = await Deno.readTextFile(path);
  } catch (err) {
    // No history file yet is normal; anything else (permissions, I/O) is a real problem and is
    // reported rather than silently presented to the user as "no history".
    if (err instanceof Deno.errors.NotFound) return [];
    throw new Error(`could not read history at ${path}: ${(err as Error).message}`, { cause: err });
  }

  const records: HistoryRecord[] = [];
  for (const line of raw.split("\n")) {
    if (line.trim().length === 0) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      // skip malformed line
    }
  }
  return records;
}

// --- Pure query functions over an already-loaded array — no file access, fully unit-testable. ---

/**
 * The trailing contiguous group of records sharing the last record's runId. Safe because the log
 * is append-only and runs never interleave: one run's records are always written together before
 * the next run starts, so "last run" is exactly "records matching the final runId".
 */
export function recordsForLastRun(records: readonly HistoryRecord[]): HistoryRecord[] {
  if (records.length === 0) return [];
  const lastRunId = records[records.length - 1].runId;
  return records.filter((r) => r.runId === lastRunId);
}
