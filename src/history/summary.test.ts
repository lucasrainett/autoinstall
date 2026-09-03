import { assertEquals } from "@std/assert";
import { summarizeHistory } from "./summary.ts";
import type { HistoryRecord } from "./types.ts";

function record(
  overrides: Partial<HistoryRecord> & Pick<HistoryRecord, "runId" | "key" | "result">,
): HistoryRecord {
  return {
    timestamp: "2026-01-01T00:00:00.000Z",
    kind: "install",
    action: "install",
    ...overrides,
  };
}

Deno.test("summarizeHistory - correctly buckets installed/skipped/failed", () => {
  const installed = record({ runId: "run-1", key: "a", result: "success" });
  const skipped = record({ runId: "run-1", key: "b", result: "skipped" });
  const failed = record({ runId: "run-1", key: "c", result: "failed", message: "boom" });

  const summary = summarizeHistory([installed, skipped, failed]);
  assertEquals(summary.installed, [installed]);
  assertEquals(summary.skipped, [skipped]);
  assertEquals(summary.failed, [failed]);
});

Deno.test("summarizeHistory - counts are derivable from the returned lists' lengths", () => {
  const records = [
    record({ runId: "run-1", key: "a", result: "success" }),
    record({ runId: "run-1", key: "b", result: "success" }),
    record({ runId: "run-1", key: "c", result: "failed" }),
  ];
  const summary = summarizeHistory(records);
  assertEquals(summary.installed.length, 2);
  assertEquals(summary.skipped.length, 0);
  assertEquals(summary.failed.length, 1);
});

Deno.test("summarizeHistory - an empty history produces empty buckets, not an error", () => {
  const summary = summarizeHistory([]);
  assertEquals(summary, { installed: [], skipped: [], failed: [] });
});
