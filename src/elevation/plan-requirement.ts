// Whether a confirmed plan needs elevated access at all — PROJECT_DEFINITION.md §15: elevation is
// requested once, only when at least one planned action actually needs it, never "just in case".
// Deliberately structural (any object with `requiresElevation: boolean` qualifies) rather than
// importing the real plan-engine type, since that's built in §1.5 — this doesn't need to wait on it.

export function planRequiresElevation(actions: readonly { requiresElevation: boolean }[]): boolean {
  return actions.some((a) => a.requiresElevation);
}
