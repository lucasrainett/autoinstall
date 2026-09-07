// Live progress state machine — TASKS.md §2. Enforced transitions (not just "set any status"),
// so "transitions correctly through pending → running → success/failed/skipped" is a real
// constraint the state machine rejects violations of, not just a description of intended usage.
// The orchestrator below is what actually demonstrates "the failure path not blocking subsequent
// entries" — it never aborts the loop on a failed or thrown action.

export type ProgressStatus = "pending" | "running" | "success" | "failed" | "skipped";

export interface ProgressEntry {
  key: string;
  status: ProgressStatus;
  /** Present on "failed" — the error detail. */
  message?: string;
}

export type ProgressState = ReadonlyMap<string, ProgressEntry>;

const VALID_TRANSITIONS: Record<ProgressStatus, readonly ProgressStatus[]> = {
  pending: ["running", "skipped"],
  running: ["success", "failed"],
  success: [],
  failed: [],
  skipped: [],
};

export function initializeProgress(keys: readonly string[]): ProgressState {
  return new Map(keys.map((key) => [key, { key, status: "pending" as const }]));
}

/** Throws on an unknown key or an invalid transition — e.g. `success` can't go back to `running`,
 * and `pending` can't jump straight to `success` without passing through `running`. */
export function transition(
  state: ProgressState,
  key: string,
  next: ProgressStatus,
  message?: string,
): ProgressState {
  const current = state.get(key);
  if (current === undefined) {
    throw new Error(`transition: unknown progress entry "${key}"`);
  }
  if (!VALID_TRANSITIONS[current.status].includes(next)) {
    throw new Error(`transition: invalid "${key}" transition ${current.status} -> ${next}`);
  }
  const copy = new Map(state);
  copy.set(key, { key, status: next, ...(message !== undefined ? { message } : {}) });
  return copy;
}

export interface ExecutionResult {
  key: string;
  status: "success" | "failed" | "skipped";
  message?: string;
  /** What was attempted. Carried through so a failure can be reported as the operation it actually
   * was: the bug report used to derive this from the entry key, which encoded the kind back when
   * keys were "category/kind/id". Flat keys have no kind in them, so every failure — including
   * updates — was reported as a failed *install*. */
  action?: string;
}

export type OperationResult =
  | {
    ok: true;
    /** Something the user needs to know about a *successful* action — currently a removal the
     * collateral guard declined. Without it a declined removal looks identical to a completed
     * one, and the user would believe software was gone when it is still installed. */
    note?: string;
  }
  | { ok: false; error: string };

/**
 * Runs `runOperation` for each action in order, reporting progress via `onProgress` after every
 * transition. A failing or throwing operation is recorded as "failed" for that one action and the
 * loop continues to the next — nothing here can abort the whole run over one bad entry. If
 * `shouldAbort` becomes true, every remaining pending action transitions straight to "skipped"
 * (never running) rather than being attempted, and the loop stops.
 */
export async function executePlanActions(
  // actionKind is optional so callers that only have keys (tests, the CLI's simpler paths) still
  // work; when present it rides along into the result so a failure can name what was attempted.
  actions: readonly { key: string; actionKind?: string }[],
  runOperation: (key: string) => Promise<OperationResult>,
  onProgress: (state: ProgressState) => void,
  shouldAbort: () => boolean = () => false,
): Promise<ExecutionResult[]> {
  let state = initializeProgress(actions.map((a) => a.key));
  onProgress(state);
  const results: ExecutionResult[] = [];

  for (const action of actions) {
    if (shouldAbort()) {
      state = transition(state, action.key, "skipped");
      results.push({
        key: action.key,
        status: "skipped",
        ...(action.actionKind !== undefined ? { action: action.actionKind } : {}),
      });
      onProgress(state);
      continue;
    }

    state = transition(state, action.key, "running");
    onProgress(state);

    let result: OperationResult;
    try {
      result = await runOperation(action.key);
    } catch (err) {
      result = { ok: false, error: (err as Error).message };
    }

    if (result.ok) {
      state = transition(state, action.key, "success");
      results.push({
        key: action.key,
        status: "success",
        ...(action.actionKind !== undefined ? { action: action.actionKind } : {}),
        ...(result.note !== undefined ? { message: result.note } : {}),
      });
    } else {
      state = transition(state, action.key, "failed", result.error);
      results.push({
        key: action.key,
        status: "failed",
        message: result.error,
        ...(action.actionKind !== undefined ? { action: action.actionKind } : {}),
      });
    }
    onProgress(state);
  }

  return results;
}
