import { assertEquals } from "@std/assert";
import { buildHistoryView, filterHistoryRecords } from "./history-view.ts";
import type { HistoryRecord } from "../history/types.ts";

function record(
  overrides: Partial<HistoryRecord> & Pick<HistoryRecord, "runId" | "key" | "timestamp" | "result">,
): HistoryRecord {
  return { kind: "install", action: "install", ...overrides };
}

const FIXTURE: HistoryRecord[] = [
  record({
    runId: "run-1",
    key: "signal",
    timestamp: "2026-01-01T10:00:00Z",
    result: "success",
  }),
  record({
    runId: "run-1",
    key: "disable-telemetry",
    timestamp: "2026-01-01T10:00:05Z",
    result: "failed",
    message: "boom",
  }),
  record({
    runId: "run-2",
    key: "signal",
    timestamp: "2026-01-02T10:00:00Z",
    result: "skipped",
  }),
];

Deno.test("filterHistoryRecords - 'all' returns every record unchanged", () => {
  assertEquals(filterHistoryRecords(FIXTURE, "all"), FIXTURE);
});

Deno.test("filterHistoryRecords - filters by a specific result", () => {
  assertEquals(filterHistoryRecords(FIXTURE, "failed"), [FIXTURE[1]]);
  assertEquals(filterHistoryRecords(FIXTURE, "skipped"), [FIXTURE[2]]);
});

Deno.test("buildHistoryView - groups records by run", () => {
  const runs = buildHistoryView(FIXTURE, "all");
  assertEquals(runs.length, 2);
  assertEquals(runs.find((r) => r.runId === "run-1")?.records.length, 2);
  assertEquals(runs.find((r) => r.runId === "run-2")?.records.length, 1);
});

Deno.test("buildHistoryView - sorts runs newest-first", () => {
  const runs = buildHistoryView(FIXTURE, "all");
  assertEquals(runs.map((r) => r.runId), ["run-2", "run-1"]); // run-2 is Jan 2, newer than run-1's Jan 1
});

Deno.test("buildHistoryView - a run with zero records matching the filter doesn't appear at all", () => {
  const runs = buildHistoryView(FIXTURE, "failed");
  assertEquals(runs.length, 1);
  assertEquals(runs[0].runId, "run-1"); // run-2 has no failed records, so it's absent, not empty
});

Deno.test("buildHistoryView - an empty history produces an empty view", () => {
  assertEquals(buildHistoryView([], "all"), []);
});

Deno.test("buildHistoryView - a run's timestamp is its first record's timestamp", () => {
  const runs = buildHistoryView(FIXTURE, "all");
  assertEquals(runs.find((r) => r.runId === "run-1")?.timestamp, "2026-01-01T10:00:00Z");
});
