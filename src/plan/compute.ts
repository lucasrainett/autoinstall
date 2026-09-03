// Plan computation — TASKS.md §1.5. Turns a selection + diagnostic snapshot (§1.4) into an
// ordered list of actions to actually run.
//
// Simplified from the original 6-kind action list ("install / skip-already-satisfied /
// update-available / apply-config / revert-config / remove") after working through the real
// semantics: under the "removal must be explicit, never implicit" rule (PROJECT_DEFINITION.md
// §2), deselecting an entry NEVER triggers its opposite/undo direction — the only way to revert
// something is to explicitly select a different (cleanup-kind) entry targeting it. So there is no
// "revert-config" action kind: reverting is just an ordinary "make this satisfied" action on some
// other entry. Likewise "skip-already-satisfied" isn't an action kind — it's tracked separately in
// `skipped`, not mixed into `actions`, so `actions` only ever contains things that actually need a
// script run.
//
// Every kind moves toward "satisfied" the same way (run the install operation, or the update
// operation if the diagnosed state is needs-update) — what differs by kind is only the
// human-meaningful label: for a cleanup-kind entry, "satisfied" means "already removed", so its
// action kind is labeled "remove" even though it's the entry's `install` operation that runs.

import { entryKey } from "../catalog/types.ts";
import type { CatalogEntry, Platform } from "../catalog/types.ts";
import type { DiagnosticSnapshotEntry } from "../diagnostics/scan.ts";

export type ActionKind = "install" | "configure" | "remove" | "update";

export interface PlanAction {
  key: string;
  actionKind: ActionKind;
  scriptPath: string;
  /** The entry's detect.sh for this platform, re-run after the action to confirm it took effect.
   * Optional only because an entry could lack one; in practice the loader requires it. */
  detectScript?: string;
  destructive: boolean;
  requiresElevation: boolean;
}

export interface SkippedEntry {
  key: string;
  /**
   * `already-satisfied` — present and current, nothing to do.
   * `update-available` — present but outdated. Deliberately *not* an action by default: the
   * selection says this should be on the machine, and it is. Sweeping every available update into
   * a plan the user opened to do one thing means the plan is no longer what they asked for.
   */
  reason: "already-satisfied" | "update-available";
}

export interface Plan {
  actions: PlanAction[];
  skipped: SkippedEntry[];
}

export interface PlanOptions {
  /**
   * Entries the user has explicitly marked for update, by key.
   *
   * A checkbox is binary and can only express presence — "this should be on my machine" — which
   * left no way to say "and bring this one up to date". Reported by the user: "we have no good way
   * to define I want to update, as the checkbox is only true/false". Update intent is therefore
   * carried separately, per entry, rather than inferred from the checkbox or applied wholesale.
   *
   * Deliberately not persisted: presence is a lasting statement about the machine, whereas "update
   * this now" is about one run. A remembered update mark would silently re-update on every launch.
   */
  updateKeys?: ReadonlySet<string>;
}

function labelFor(kind: CatalogEntry["kind"]): "install" | "configure" | "remove" {
  if (kind === "install") return "install";
  if (kind === "configure") return "configure";
  return "remove";
}

export function computePlan(
  catalog: readonly CatalogEntry[],
  platform: Platform,
  selectedKeys: ReadonlySet<string>,
  snapshot: readonly DiagnosticSnapshotEntry[],
  options: PlanOptions = {},
): Plan {
  const { updateKeys = new Set<string>() } = options;
  const stateByKey = new Map(snapshot.map((s) => [s.key, s.result]));
  const actions: PlanAction[] = [];
  const skipped: SkippedEntry[] = [];

  for (const entry of catalog) {
    const key = entryKey(entry);

    const ops = entry.platforms[platform];
    if (ops === undefined) continue; // not applicable on this platform — nothing to plan

    const stateResult = stateByKey.get(key);
    if (stateResult === undefined || !stateResult.ok) continue; // no usable diagnosis — surfaced elsewhere, not as a plan action

    const selected = selectedKeys.has(key);
    const present = stateResult.state !== "unsatisfied";

    // The selection is a statement of *desired state* — "this should be on my machine" — not a
    // list of actions to perform. So both directions are planned: a selected entry that is absent
    // gets applied, and a deselected entry that is present gets undone. Previously a deselected
    // entry was skipped entirely, which meant unchecking something did nothing at all and removal
    // required a separate cleanup-kind entry.
    if (!selected) {
      if (!present) continue; // already absent — desired state already holds
      const removeScript = ops.remove;
      if (removeScript === undefined) continue; // nothing runnable to undo it with
      actions.push({
        key,
        // Uniformly `remove`, which is correct for every kind because each kind defines its own
        // remove.sh as "undo install.sh" — for a cleanup entry that means reinstalling the app.
        actionKind: "remove",
        scriptPath: removeScript,
        ...(ops.detect !== undefined ? { detectScript: ops.detect } : {}),
        // Removal is destructive by its nature, so it is flagged without each entry having to
        // remember to say so. That matters more under desired-state selection than it used to:
        // unchecking a box is now what triggers a removal, and PROJECT_DEFINITION §14 promises
        // nothing destructive happens without the user seeing it named in the plan first. An
        // entry can still declare itself destructive to install, which is why the flag wins.
        destructive: entry.meta.destructive ?? true,
        requiresElevation: entry.meta.platforms?.[platform]?.requiresElevation ?? false,
      });
      continue;
    }

    if (stateResult.state === "satisfied") {
      skipped.push({ key, reason: "already-satisfied" });
      continue;
    }

    // Present but outdated already satisfies "this should be on my machine", so it is left alone
    // unless the user marked this specific entry for update.
    if (stateResult.state === "needs-update" && !updateKeys.has(key)) {
      skipped.push({ key, reason: "update-available" });
      continue;
    }

    const actionKind: ActionKind = stateResult.state === "needs-update"
      ? "update"
      : labelFor(entry.kind);

    const scriptPath = actionKind === "update" ? (ops.update ?? ops.install) : ops.install;
    if (scriptPath === undefined) continue; // neither script exists for this platform — nothing runnable

    actions.push({
      key,
      actionKind,
      scriptPath,
      ...(ops.detect !== undefined ? { detectScript: ops.detect } : {}),
      destructive: entry.meta.destructive ?? false,
      requiresElevation: entry.meta.platforms?.[platform]?.requiresElevation ?? false,
    });
  }

  return { actions, skipped };
}
