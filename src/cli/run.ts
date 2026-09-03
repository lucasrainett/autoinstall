// Non-interactive CLI execution — TASKS.md §2 ("Unattended and dry-run CLI modes that bypass the
// TUI entirely"). The engine (catalog, diagnostics, plan computation, script execution) has zero
// TUI dependency (TASKS.md's Phase-1 hard rule), so both modes here just call straight through it.
// Unattended mode (--yes) and the interactive TUI's confirm-then-run flow are meant to call the
// exact same computePlan + executePlanActions + runPlanAction — not two implementations that
// happen to look similar — so "unattended execution is identical to interactively confirming the
// same selection" holds by construction.

import { computePlan, type Plan } from "../plan/compute.ts";
import { renderPlan } from "../plan/render.ts";
import { executePlanActions, type ExecutionResult, type ProgressState } from "../tui/progress.ts";
import { type PlanActionResult, runPlanAction } from "../exec/plan-runner.ts";
import type { CatalogEntry, Platform } from "../catalog/types.ts";
import type { DiagnosticSnapshotEntry } from "../diagnostics/scan.ts";
import type { CliMode } from "./args.ts";

export interface DryRunOutput {
  kind: "dry-run";
  plan: Plan;
  renderedPlan: string;
}

export interface UnattendedOutput {
  kind: "unattended";
  plan: Plan;
  results: ExecutionResult[];
}

export interface CliRunDeps {
  /** Fold available updates into the plan (`--with-updates`). Off by default so a run does what
   * the saved selection asks for and nothing more. */
  includeUpdates?: boolean;
  catalog: readonly CatalogEntry[];
  platform: Platform;
  selectedKeys: ReadonlySet<string>;
  snapshot: readonly DiagnosticSnapshotEntry[];
  /** Injectable so tests never spawn a real process; defaults to the real script runner. */
  runAction?: (action: Plan["actions"][number]) => Promise<PlanActionResult>;
  /** Extra environment for catalog scripts (identity, see exec/script-env.ts). */
  scriptEnv?: Record<string, string>;
  onProgress?: (state: ProgressState) => void;
}

/**
 * Dispatches to dry-run or unattended execution per the already-parsed CLI mode. Not meant for
 * `mode: "tui"` — routing to the interactive app is the caller's job; this throws for that case
 * since there is no non-interactive behavior to fall back to.
 */
export async function runCli(
  mode: CliMode,
  deps: CliRunDeps,
): Promise<DryRunOutput | UnattendedOutput> {
  if (mode === "tui") {
    throw new Error("runCli does not handle 'tui' mode — route to the interactive app instead");
  }

  // `--with-updates` means "everything that has one", expressed as the same per-entry mark the
  // interface uses, so both paths go through one mechanism in the planner.
  const updateKeys = deps.includeUpdates
    ? new Set(
      deps.snapshot
        .filter((s) => s.result.ok && s.result.state === "needs-update")
        .map((s) => s.key),
    )
    : new Set<string>();
  const plan = computePlan(deps.catalog, deps.platform, deps.selectedKeys, deps.snapshot, {
    updateKeys,
  });

  if (mode === "dry-run") {
    return { kind: "dry-run", plan, renderedPlan: renderPlan(plan, deps.catalog) };
  }

  const runAction = deps.runAction ??
    ((action: Plan["actions"][number]) => runPlanAction(action, undefined, deps.scriptEnv));
  const results = await executePlanActions(
    plan.actions,
    (key) => runAction(plan.actions.find((a) => a.key === key)!),
    deps.onProgress ?? (() => {}),
  );
  return { kind: "unattended", plan, results };
}
