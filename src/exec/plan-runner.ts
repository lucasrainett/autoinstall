// Wires a single plan action (plan/compute.ts's PlanAction) to the real script runner
// (runner.ts). This is the one function both the TUI (after PlanReviewScreen confirms — future
// wiring) and the unattended CLI (--yes, cli/run.ts) call through progress.ts's
// executePlanActions: same function, so "unattended execution is identical to interactively
// confirming the same plan" holds by construction, not just by similarly-shaped code living in
// two places.

import { runScript } from "./runner.ts";
import { resolveDetectState } from "./state.ts";
import type { PlanAction } from "../plan/compute.ts";

/**
 * Exit code a remove script uses to say "I declined; nothing changed" — the collateral guard's
 * outcome, where removing a package would have taken unrelated software with it. Distinct from 0
 * because the verification below re-runs detect: reporting success for a deliberate non-removal
 * would make the check call a correct, protective decision a failure.
 */
export const DECLINED_EXIT_CODE = 3;

/** How long the post-action detect gets. Same bound the startup scan uses. */
export const VERIFY_TIMEOUT_MS = 60_000;

/** Structurally identical to tui/progress.ts's OperationResult — not imported from there to avoid
 * a src/exec -> src/tui dependency; TypeScript's structural typing makes this assignable wherever
 * that type is expected. */
export type PlanActionResult =
  | { ok: true; note?: string }
  | { ok: false; error: string };

/**
 * Installs legitimately take minutes (Docker, an IDE, a large AppImage), so this is generous —
 * but it is not unbounded. Without any limit a script that waits on input, or on a dead network
 * socket, freezes the progress screen forever with no way out; every real run went through this
 * path with no timeout at all until now.
 */
export const DEFAULT_ACTION_TIMEOUT_MS = 30 * 60 * 1000;

export async function runPlanAction(
  action: PlanAction,
  execute: typeof runScript = runScript,
  /** Extra environment handed to the script — see exec/script-env.ts. Merged with the inherited
   * environment by the runner, never a replacement for it. */
  env?: Record<string, string>,
): Promise<PlanActionResult> {
  // An elevated action's script runs `sudo` itself, so it must keep the caller's controlling
  // terminal — sudo's credential cache is keyed by terminal, and a session-isolated script can
  // never match the credential acquired up front (see runner.ts's option docs).
  const result = await execute(action.scriptPath, {
    preserveControllingTerminal: action.requiresElevation,
    timeoutMs: DEFAULT_ACTION_TIMEOUT_MS,
    ...(env !== undefined ? { env } : {}),
  });

  if (result.timedOut) {
    return { ok: false, error: `timed out running ${action.scriptPath}` };
  }
  if (result.exitCode === DECLINED_EXIT_CODE && action.actionKind === "remove") {
    // A correct outcome, not a failure: the script refused to take unrelated software with it.
    return {
      ok: true,
      note: "declined — removing it would have taken unrelated software with it; left installed",
    };
  }

  if (result.exitCode !== 0) {
    const detail = result.stderr.trim();
    return {
      ok: false,
      error: detail.length > 0 ? detail : `exited with code ${result.exitCode ?? "unknown"}`,
    };
  }

  // A script exiting 0 only means it *ran* without error, which is not the same as having worked:
  // an installer can print a warning, skip the real work and still exit clean. Re-running detect
  // is the one check that reflects the machine rather than the script's own opinion of itself.
  if (action.detectScript !== undefined) {
    const verdict = await verifyAction(action, execute, env);
    if (verdict !== undefined) return verdict;
  }

  return { ok: true };
}

/** Returns a result only when verification found a problem; undefined means the action held up. */
/**
 * How long to keep re-checking a removal before believing the software is still there.
 *
 * Windows uninstallers are frequently asynchronous: winget reports "Successfully uninstalled" as
 * soon as it has *launched* the uninstaller, which may still be removing files and registry keys
 * when the verification runs a moment later. Observed on a real Windows runner with VLC, where the
 * removal genuinely succeeded and the immediate re-check still saw it installed.
 *
 * Only removals get this. An install that has not taken effect is not going to start working while
 * we wait, so retrying there would only slow down a real failure.
 */
export const REMOVAL_SETTLE_ATTEMPTS = 4;
export const REMOVAL_SETTLE_DELAY_MS = 2000;

async function verifyAction(
  action: PlanAction,
  execute: typeof runScript,
  env?: Record<string, string>,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<PlanActionResult | undefined> {
  const runDetect = () =>
    execute(action.detectScript as string, {
      timeoutMs: VERIFY_TIMEOUT_MS,
      ...(env !== undefined ? { env } : {}),
    });

  let detect = await runDetect();
  if (action.actionKind === "remove") {
    // Re-check rather than sleep-then-check: a synchronous uninstaller — which is most of them —
    // is verified on the first attempt and costs nothing.
    for (let attempt = 1; attempt < REMOVAL_SETTLE_ATTEMPTS; attempt++) {
      const interim = resolveDetectState(detect);
      if (interim.ok && interim.state === "unsatisfied") break;
      await sleep(REMOVAL_SETTLE_DELAY_MS);
      detect = await runDetect();
    }
  }

  const state = resolveDetectState(detect);
  if (!state.ok) {
    // The action itself succeeded; only the check is inconclusive. Saying so beats inventing
    // either verdict.
    return { ok: true, note: `could not verify afterwards — ${state.error}` };
  }

  const present = state.state !== "unsatisfied";
  if (action.actionKind === "remove") {
    return present
      ? { ok: false, error: "reported success but the entry is still present afterwards" }
      : undefined;
  }

  // install / configure / update all mean "this should be here afterwards".
  if (!present) {
    return { ok: false, error: "reported success but the entry is still not present afterwards" };
  }
  if (action.actionKind === "update" && state.state === "needs-update") {
    return { ok: false, error: "reported success but an update is still available afterwards" };
  }
  return undefined;
}
