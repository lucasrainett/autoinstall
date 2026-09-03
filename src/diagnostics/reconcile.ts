// Reconciliation between live diagnosed state and remembered prior selection — TASKS.md §1.4,
// PROJECT_DEFINITION.md §3: the two are different things and can disagree (something was
// installed or removed outside the tool since the last run); both get surfaced, neither silently
// wins. Deliberately structural (a plain snapshot-shaped input) rather than importing §1.7's real
// config type, since that module doesn't exist yet — this doesn't need to wait on it.

import type { DiagnosticSnapshotEntry } from "./scan.ts";

export interface Disagreement {
  key: string;
  /** What the user chose last time this entry was selected/deselected. */
  wasSelected: boolean;
  /** What's actually true on the machine right now. */
  liveState: "satisfied" | "unsatisfied" | "needs-update";
}

/**
 * A "needs-update" entry still counts as present for this comparison — it disagrees with the
 * remembered selection only the same way "satisfied" would (i.e. not at all, if it was selected).
 * The satisfied/needs-update distinction is a separate, later concern (the plan engine offering an
 * update action), not part of "did the user's choice actually hold."
 */
export function reconcileWithRememberedSelection(
  snapshot: readonly DiagnosticSnapshotEntry[],
  rememberedSelections: ReadonlySet<string>,
): Disagreement[] {
  const disagreements: Disagreement[] = [];

  for (const { key, result } of snapshot) {
    if (!result.ok) continue; // can't meaningfully reconcile an error state

    const wasSelected = rememberedSelections.has(key);
    const isPresentNow = result.state !== "unsatisfied";

    if (wasSelected !== isPresentNow) {
      disagreements.push({ key, wasSelected, liveState: result.state });
    }
  }

  return disagreements;
}
