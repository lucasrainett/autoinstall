// Viewport math for the plan/review screen — the unit-testable half of PlanReviewScreen.tsx.
//
// Kept separate for the reason this project keeps hitting: the component itself is only
// verifiable by eye in a terminal, but "does a 41-action plan hide actions the user is approving"
// is exactly the kind of question that must be answerable by a test.

export interface PlanViewport {
  /** How many rows of plan text may be drawn. */
  contentRows: number;
  /** Whether the plan is taller than the space available, so scroll affordances are needed. */
  scrollable: boolean;
}

/**
 * Splits the pane's rows between the plan text and the chrome below it.
 *
 * Reserves one row for the "Proceed? [y/N]" prompt, which must *always* be visible — a confirm
 * screen that has scrolled its own prompt off the bottom is unusable — plus one for the
 * "showing x–y of z" indicator when there is more than fits.
 */
export function planViewport(totalLines: number, availableRows: number): PlanViewport {
  const forPrompt = 1;
  // Assume the indicator is needed, then re-check: reserving a row for it can be what makes the
  // content fit, and dropping it again would make the plan taller than the pane. Deciding once,
  // pessimistically, avoids that oscillation.
  const candidate = Math.max(1, availableRows - forPrompt);
  if (totalLines <= candidate) return { contentRows: candidate, scrollable: false };

  const forIndicator = 1;
  return {
    contentRows: Math.max(1, availableRows - forPrompt - forIndicator),
    scrollable: true,
  };
}

/** Keeps a scroll offset inside the plan, so paging past either end simply stops at it. */
export function clampPlanScroll(offset: number, totalLines: number, contentRows: number): number {
  const maxOffset = Math.max(0, totalLines - contentRows);
  if (!Number.isFinite(offset)) return 0;
  return Math.max(0, Math.min(Math.trunc(offset), maxOffset));
}
