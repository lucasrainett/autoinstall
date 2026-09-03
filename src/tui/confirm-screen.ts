// Confirm/cancel gate for the plan/review screen — TASKS.md §2. This is the actually-testable
// half of "requires explicit confirm": a plain controller with no React/Ink involved at all, so
// "does an arbitrary keypress accidentally trigger execution" and "does cancel really call zero
// times into whatever runs the plan" are directly unit-testable with spy functions, not something
// that needs rendering or a pty to verify.

export type ConfirmAction = "confirm" | "cancel";

/** Enter or "y"/"Y" confirms; Escape or "n"/"N" cancels; anything else is not a recognized action
 * at all — not confirm, not cancel, just ignored. */
export function classifyConfirmInput(
  input: string,
  key: { return?: boolean; escape?: boolean },
): ConfirmAction | undefined {
  if (key.return || input.toLowerCase() === "y") return "confirm";
  if (key.escape || input.toLowerCase() === "n") return "cancel";
  return undefined;
}

export interface ConfirmScreenController {
  handleInput(input: string, key: { return?: boolean; escape?: boolean }): void;
}

/**
 * Once a decision is made (confirm or cancel), further input is ignored — the gate settles once,
 * so a stray keypress after confirming can never trigger a second, duplicate run.
 */
export function createConfirmScreenController(
  onConfirm: () => void,
  onCancel: () => void,
): ConfirmScreenController {
  let settled = false;
  return {
    handleInput(input, key) {
      if (settled) return;
      const action = classifyConfirmInput(input, key);
      if (action === "confirm") {
        settled = true;
        onConfirm();
      } else if (action === "cancel") {
        settled = true;
        onCancel();
      }
    },
  };
}
