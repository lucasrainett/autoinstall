// App shell layout math — TASKS.md §2 (App shell/layout). Pure sizing computation, deliberately
// separate from any Ink/React component: this is the unit-testable half of "pane-sizing/resizing
// math is unit-testable in isolation; actual terminal rendering is integration/manual." The
// three-pane shape (category list left, detail right, log/progress along the bottom) matches
// PROJECT_DEFINITION.md §10 ("distinct panes/areas for browsing categories, viewing
// details/descriptions, and watching live progress/output").

export interface TerminalSize {
  columns: number;
  rows: number;
}

export interface PaneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PaneLayout {
  categoryList: PaneRect;
  /** Top of the right-hand column: what the cursor is on. */
  detail: PaneRect;
  /** Bottom of the right-hand column: what pressing Enter would do, always on screen. */
  plan: PaneRect;
  log: PaneRect;
}

export interface LayoutOptions {
  /**
   * Fraction of total width given to the category list pane. Default 0.45.
   *
   * This has moved twice, for opposite reasons. The original 0.3 left the list cramped and the
   * detail pane ~95% empty, so it went to 0.6. Splitting the right-hand column changed the
   * arithmetic again: it now stacks *two* panes, and the plan's lines are the longest text in the
   * interface — `install  Ungoogled Chromium (requires elevated access) [DESTRUCTIVE …]` — while a
   * list row is only a checkbox, an indent and a name (the longest in the catalog is 26
   * characters). The list therefore needs less width than the column beside it, which is why the
   * majority share moved across.
   */
  categoryListWidthRatio?: number;
  /** Fraction of total height given to the log pane. Default 0.2. */
  logHeightRatio?: number;
  /**
   * Fraction of the right-hand column given to the details pane, the rest going to the plan.
   * Default 0.5.
   *
   * An even split rather than favouring details: details describe one entry in four short lines,
   * while the plan can list every action of a large run, and the plan is the pane a user checks
   * before committing to anything.
   */
  detailHeightRatio?: number;
  /** Never let a pane's dimension shrink below this, even on a tiny terminal. Default 3. */
  minPaneDimension?: number;
}

const DEFAULTS: Required<LayoutOptions> = {
  categoryListWidthRatio: 0.45,
  logHeightRatio: 0.2,
  detailHeightRatio: 0.5,
  minPaneDimension: 3,
};

export function computeLayout(terminal: TerminalSize, options: LayoutOptions = {}): PaneLayout {
  const { categoryListWidthRatio, logHeightRatio, detailHeightRatio, minPaneDimension } = {
    ...DEFAULTS,
    ...options,
  };

  const logHeight = Math.max(minPaneDimension, Math.round(terminal.rows * logHeightRatio));
  const topHeight = Math.max(minPaneDimension, terminal.rows - logHeight);

  const categoryListWidth = Math.max(
    minPaneDimension,
    Math.round(terminal.columns * categoryListWidthRatio),
  );
  const detailWidth = Math.max(minPaneDimension, terminal.columns - categoryListWidth);

  // The right-hand column is split horizontally: details above, the plan below. Both are clamped
  // to the minimum, and the plan takes whatever is left over so the two always sum to topHeight —
  // a rounding gap here would leave a dead row between two bordered panes.
  const detailHeight = Math.max(
    minPaneDimension,
    Math.min(topHeight - minPaneDimension, Math.round(topHeight * detailHeightRatio)),
  );
  const planHeight = Math.max(minPaneDimension, topHeight - detailHeight);

  return {
    categoryList: { x: 0, y: 0, width: categoryListWidth, height: topHeight },
    detail: { x: categoryListWidth, y: 0, width: detailWidth, height: detailHeight },
    plan: {
      x: categoryListWidth,
      y: detailHeight,
      width: detailWidth,
      height: planHeight,
    },
    log: { x: 0, y: topHeight, width: terminal.columns, height: logHeight },
  };
}
