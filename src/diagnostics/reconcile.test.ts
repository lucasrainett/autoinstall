import { assertEquals } from "@std/assert";
import { reconcileWithRememberedSelection } from "./reconcile.ts";
import type { DiagnosticSnapshotEntry } from "./scan.ts";

function snapshotEntry(
  key: string,
  state: "satisfied" | "unsatisfied" | "needs-update",
): DiagnosticSnapshotEntry {
  return { key, result: { ok: true, state } };
}

Deno.test("reconcileWithRememberedSelection - selected and satisfied: no disagreement", () => {
  const snapshot = [snapshotEntry("communication/install/signal", "satisfied")];
  const remembered = new Set(["communication/install/signal"]);
  assertEquals(reconcileWithRememberedSelection(snapshot, remembered), []);
});

Deno.test("reconcileWithRememberedSelection - not selected and unsatisfied: no disagreement", () => {
  const snapshot = [snapshotEntry("communication/install/signal", "unsatisfied")];
  const remembered = new Set<string>();
  assertEquals(reconcileWithRememberedSelection(snapshot, remembered), []);
});

Deno.test("reconcileWithRememberedSelection - selected but now unsatisfied: flagged (removed outside the tool)", () => {
  const snapshot = [snapshotEntry("communication/install/signal", "unsatisfied")];
  const remembered = new Set(["communication/install/signal"]);
  assertEquals(reconcileWithRememberedSelection(snapshot, remembered), [
    { key: "communication/install/signal", wasSelected: true, liveState: "unsatisfied" },
  ]);
});

Deno.test("reconcileWithRememberedSelection - not selected but now satisfied: flagged (installed outside the tool)", () => {
  const snapshot = [snapshotEntry("communication/install/signal", "satisfied")];
  const remembered = new Set<string>();
  assertEquals(reconcileWithRememberedSelection(snapshot, remembered), [
    { key: "communication/install/signal", wasSelected: false, liveState: "satisfied" },
  ]);
});

Deno.test("reconcileWithRememberedSelection - needs-update counts as present, same as satisfied, for this comparison", () => {
  const snapshot = [snapshotEntry("communication/install/signal", "needs-update")];
  const remembered = new Set(["communication/install/signal"]);
  assertEquals(reconcileWithRememberedSelection(snapshot, remembered), []);
});

Deno.test("reconcileWithRememberedSelection - an error state is skipped, not reconciled", () => {
  const snapshot: DiagnosticSnapshotEntry[] = [
    { key: "communication/install/signal", result: { ok: false, error: "boom" } },
  ];
  assertEquals(
    reconcileWithRememberedSelection(snapshot, new Set(["communication/install/signal"])),
    [],
  );
});
