// State resolution — TASKS.md §1.3. Turns a detect script's raw result into a meaningful state.
//
// Exit code convention for every detect.sh, regardless of kind:
//   0 = satisfied      (already installed / already configured / already removed, per kind)
//   1 = unsatisfied     (not installed / not configured / still present, per kind)
//   2 = needs-update    (present, but not at the desired version/value)
// Any other exit code — or a timed-out run — is an error, not guessed at: a detect script that
// doesn't follow this convention is a bug in that script, and the engine should say so rather
// than silently treating it as satisfied or unsatisfied.

export type EntryState = "satisfied" | "unsatisfied" | "needs-update";

export type StateResolutionResult =
  | { ok: true; state: EntryState }
  | { ok: false; error: string };

export function resolveDetectState(
  result: { exitCode: number | null; timedOut: boolean },
): StateResolutionResult {
  if (result.timedOut || result.exitCode === null) {
    return { ok: false, error: "detect script timed out; cannot determine state" };
  }
  switch (result.exitCode) {
    case 0:
      return { ok: true, state: "satisfied" };
    case 1:
      return { ok: true, state: "unsatisfied" };
    case 2:
      return { ok: true, state: "needs-update" };
    default:
      return {
        ok: false,
        error: `detect script exited with unexpected code ${result.exitCode} (expected 0, 1, or 2)`,
      };
  }
}
