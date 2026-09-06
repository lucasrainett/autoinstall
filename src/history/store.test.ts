import { assertEquals } from "@std/assert";
import { appendHistoryRecord, readHistory, recordsForLastRun } from "./store.ts";
import type { HistoryRecord } from "./types.ts";

function record(
  overrides: Partial<HistoryRecord> & Pick<HistoryRecord, "runId" | "key">,
): HistoryRecord {
  return {
    timestamp: "2026-01-01T00:00:00.000Z",
    kind: "install",
    action: "install",
    result: "success",
    ...overrides,
  };
}

Deno.test("appendHistoryRecord / readHistory - round-trips one record", async () => {
  const path = await Deno.makeTempFile();
  const rec = record({ runId: "run-1", key: "signal" });
  await appendHistoryRecord(path, rec);
  assertEquals(await readHistory(path), [rec]);
  await Deno.remove(path);
});

Deno.test("appendHistoryRecord - appends without overwriting prior records", async () => {
  const path = await Deno.makeTempFile();
  const first = record({ runId: "run-1", key: "a" });
  const second = record({ runId: "run-1", key: "b" });
  await appendHistoryRecord(path, first);
  await appendHistoryRecord(path, second);
  assertEquals(await readHistory(path), [first, second]);
  await Deno.remove(path);
});

Deno.test("readHistory - a missing file is empty history, not an error", async () => {
  assertEquals(await readHistory("/tmp/does-not-exist-autoinstall-history.jsonl"), []);
});

Deno.test("appendHistoryRecord - creates a missing parent directory rather than throwing (a real first-run crash this project hit)", async () => {
  const dir = await Deno.makeTempDir();
  const path = `${dir}/nested/does/not/exist/history.jsonl`;
  const rec = record({ runId: "run-1", key: "signal" });
  await appendHistoryRecord(path, rec); // must not throw NotFound
  assertEquals(await readHistory(path), [rec]);
  await Deno.remove(dir, { recursive: true });
});

Deno.test("readHistory - skips a malformed line rather than aborting the whole read", async () => {
  const path = await Deno.makeTempFile();
  const good = record({ runId: "run-1", key: "signal" });
  await Deno.writeTextFile(path, `${JSON.stringify(good)}\nnot valid json\n`);
  assertEquals(await readHistory(path), [good]);
  await Deno.remove(path);
});

Deno.test("recordsForLastRun - returns only the trailing run's records", () => {
  const records = [
    record({ runId: "run-1", key: "a" }),
    record({ runId: "run-1", key: "b" }),
    record({ runId: "run-2", key: "a" }),
  ];
  assertEquals(recordsForLastRun(records), [records[2]]);
});

Deno.test("recordsForLastRun - empty history returns empty", () => {
  assertEquals(recordsForLastRun([]), []);
});
