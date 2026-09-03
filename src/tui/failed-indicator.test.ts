import { assertEquals } from "@std/assert";
import { itemIndicator } from "./checkbox-list.ts";
import type { DiagnosticSnapshotEntry } from "../diagnostics/scan.ts";

const snap = (key: string, state: "satisfied" | "unsatisfied" | "needs-update") =>
  ({ key, result: { ok: true as const, state } }) satisfies DiagnosticSnapshotEntry;

Deno.test("itemIndicator - an entry that failed and is still absent shows as failed", () => {
  // The reported gap: after a failed install the row looked exactly like one merely ticked and not
  // yet applied — a checked box with no ✓ and nothing else.
  assertEquals(
    itemIndicator("a", [snap("a", "unsatisfied")], new Set(["a"])),
    "failed",
  );
});

Deno.test("itemIndicator - an entry that failed but is now present shows as installed", () => {
  // The machine is the source of truth. A stale failure must never contradict what is actually
  // installed — e.g. the user installed it by hand afterwards.
  assertEquals(itemIndicator("a", [snap("a", "satisfied")], new Set(["a"])), "satisfied");
  assertEquals(itemIndicator("a", [snap("a", "needs-update")], new Set(["a"])), "needs-update");
});

Deno.test("itemIndicator - an absent entry that did not fail is just absent", () => {
  assertEquals(itemIndicator("a", [snap("a", "unsatisfied")], new Set()), "unsatisfied");
});

Deno.test("itemIndicator - with no failures at all it matches the plain status", () => {
  assertEquals(itemIndicator("a", [snap("a", "satisfied")]), "satisfied");
  assertEquals(itemIndicator("missing", []), "unknown");
});
