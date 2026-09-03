// Full-catalog diagnostic scan — TASKS.md §1.4. Runs the detect operation for every entry
// applicable to the current platform, before the selection UI renders (PROJECT_DEFINITION.md §3),
// producing one snapshot record per applicable entry. Tolerant by design: one entry's detect
// script throwing never aborts the scan for every other entry.

import { entryKey } from "../catalog/types.ts";
import type { CatalogEntry, Platform } from "../catalog/types.ts";
import { resolveDetectState, type StateResolutionResult } from "../exec/state.ts";
import type { ScriptResult } from "../exec/runner.ts";

export interface DiagnosticSnapshotEntry {
  /** "category/kind/id" — matches the key shape used for overlay-repo override lookups (§1.9). */
  key: string;
  result: StateResolutionResult;
}

/**
 * `runDetect` is injected (rather than calling exec/runner.ts's runScript directly) so this can be
 * unit-tested against fixture entries without ever spawning a real process.
 */
export async function runDiagnosticScan(
  entries: readonly CatalogEntry[],
  platform: Platform,
  runDetect: (scriptPath: string) => Promise<ScriptResult>,
  /**
   * Called after each entry is diagnosed, with how many are done out of how many will run.
   *
   * The scan spawns one real subprocess per entry and takes seconds on a full catalog, during
   * which the interface previously showed a single static line — indistinguishable from being
   * hung. `total` counts only entries applicable to this platform, so the number the user watches
   * is the number that will actually run.
   */
  onProgress?: (done: number, total: number, key: string) => void,
): Promise<DiagnosticSnapshotEntry[]> {
  const snapshot: DiagnosticSnapshotEntry[] = [];
  const applicable = entries.filter((e) => e.platforms[platform]?.detect !== undefined);
  const total = applicable.length;
  let done = 0;

  for (const entry of applicable) {
    const detectPath = entry.platforms[platform]?.detect;
    if (detectPath === undefined) continue; // not applicable on this platform — excluded, not an error

    const key = entryKey(entry);
    try {
      const scriptResult = await runDetect(detectPath);
      snapshot.push({ key, result: resolveDetectState(scriptResult) });
    } catch (err) {
      snapshot.push({
        key,
        result: { ok: false, error: `detect script threw: ${(err as Error).message}` },
      });
    }
    done++;
    onProgress?.(done, total, key);
  }

  return snapshot;
}
