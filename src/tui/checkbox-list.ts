// Checkbox list logic — TASKS.md §2. Pure functions, deliberately separate from the Ink component
// that renders them (CheckboxList.tsx) — same split as layout.ts, for the same reason: this is
// the actually-testable half of a TUI component.

import { CHECKBOX_WIDTH } from "./glyphs.ts";
import type { DiagnosticSnapshotEntry } from "../diagnostics/scan.ts";

export interface ListItem {
  /** The entry's id. Not unique across rows: an entry belonging to several categories contributes
   * one row to each, and they all share this key so they share one selection state. */
  key: string;
  /** The category this particular row sits under. */
  category: string;
  /** Every category the entry belongs to. Not used for grouping, only for searching, so an entry
   * is still findable under a category it is not filed under. */
  categories: readonly string[];
  /** Capability keys, so searching for what you want to *do* finds the software that does it. */
  capabilities: readonly string[];
  name: string;
  description: string;
}

export function filterItems(items: readonly ListItem[], searchTerm: string): ListItem[] {
  const term = searchTerm.trim().toLowerCase();
  if (term === "") return [...items];
  return items.filter((item) =>
    item.name.toLowerCase().includes(term) ||
    item.description.toLowerCase().includes(term) ||
    item.categories.some((c) => c.toLowerCase().includes(term)) ||
    // Capabilities are searchable because they are the question people actually arrive with:
    // typing "browser chooser" or "link-routing" should find Junction here and BrowserSelect on
    // Windows, which are different programs for the same need.
    item.capabilities.some((c) => c.toLowerCase().includes(term))
  );
}

export interface CategoryGroup {
  category: string;
  items: ListItem[];
}

/** Groups (should be called on an already-filtered list, so a search narrows categories too). */
export function groupByCategory(items: readonly ListItem[]): CategoryGroup[] {
  const map = new Map<string, ListItem[]>();
  for (const item of items) {
    const group = map.get(item.category);
    if (group) {
      group.push(item);
    } else {
      map.set(item.category, [item]);
    }
  }
  return [...map.entries()].map(([category, groupItems]) => ({ category, items: groupItems }));
}

/** Adds every currently-visible (filtered) item to the selection — never touches a selected item
 * that's currently hidden by the filter, which is the whole point of scoping to `visibleItems`. */
export function selectAllVisible(
  selection: ReadonlySet<string>,
  visibleItems: readonly ListItem[],
): Set<string> {
  return new Set([...selection, ...visibleItems.map((i) => i.key)]);
}

/** Removes every currently-visible item from the selection — a selection hidden by the filter is
 * left untouched, exactly mirroring selectAllVisible's scoping. */
/** Maps a rendered content row (0-based, counting every line CheckboxList actually draws — one
 * category header row followed by that category's item rows, repeated per group) to the flat
 * index into the visible-items list that `row` corresponds to. Returns undefined if `row` lands
 * on a category header row or past the end of the list — a click there selects nothing.
 *
 * This is the piece `mouseClickToListIndex` (input.ts) deliberately leaves to the caller: that
 * function only gets you from a click point to "which content row", not from "which content row"
 * to "which item", since only the component doing the grouping knows where its headers fall. */
export function rowToItemIndex(groups: readonly CategoryGroup[], row: number): number | undefined {
  if (row < 0) return undefined;
  let cursor = 0;
  let itemIndex = 0;
  for (const group of groups) {
    if (cursor === row) return undefined; // the category header row itself
    cursor++;
    if (row < cursor + group.items.length) return itemIndex + (row - cursor);
    cursor += group.items.length;
    itemIndex += group.items.length;
  }
  return undefined;
}

/** Total number of rendered content rows (category headers + items) across all groups — the full
 * extent a scrollable viewport needs to fit within. */
/** The inverse of `rowToItemIndex`: which content row a given flat item index renders at. Used to
 * find where the cursor currently sits so scrolling can keep it in view. */
export function itemIndexToRow(
  groups: readonly CategoryGroup[],
  itemIndex: number,
): number | undefined {
  if (itemIndex < 0) return undefined;
  let row = 0;
  let seen = 0;
  for (const group of groups) {
    row++; // the category header row
    if (itemIndex < seen + group.items.length) return row + (itemIndex - seen);
    row += group.items.length;
    seen += group.items.length;
  }
  return undefined;
}

/** One renderable row: either a category header or an item, in the same top-to-bottom order
 * `rowToItemIndex`/`itemIndexToRow` use. Lets the component render a plain slice of this array
 * for its visible viewport instead of nested-loop rendering with manual index tracking. */
export type ContentRow =
  | { kind: "header"; category: string }
  | { kind: "item"; item: ListItem; itemIndex: number };

export function buildContentRows(groups: readonly CategoryGroup[]): ContentRow[] {
  const rows: ContentRow[] = [];
  let itemIndex = 0;
  for (const group of groups) {
    rows.push({ kind: "header", category: group.category });
    for (const item of group.items) {
      rows.push({ kind: "item", item, itemIndex });
      itemIndex++;
    }
  }
  return rows;
}

/** Keeps `cursorRow` inside the visible window `[offset, offset+viewportHeight)`, scrolling the
 * minimum amount needed rather than always re-centering — jumps up if the cursor moved above the
 * window, down if it moved below, otherwise leaves the current scroll position alone. Clamped so
 * the window never scrolls past the point where the last row is at the bottom (no dangling empty
 * space below the content once you've scrolled to the end). */
export function computeScrollOffset(
  cursorRow: number,
  previousOffset: number,
  viewportHeight: number,
  totalRows: number,
): number {
  if (viewportHeight <= 0) return 0;
  let offset = previousOffset;
  if (cursorRow < offset) offset = cursorRow;
  else if (cursorRow >= offset + viewportHeight) offset = cursorRow - viewportHeight + 1;
  const maxOffset = Math.max(0, totalRows - viewportHeight);
  return Math.max(0, Math.min(offset, maxOffset));
}

/** Width in columns of a rendered row's checkbox glyph — "[X]" or "[ ]" — starting at the row's
 * own left edge (column 0 relative to the row, i.e. `pane.x` in absolute terms). */
/** Re-exported from glyphs.ts so the hit-testing below can never disagree with what is drawn. */
export const CHECKBOX_GLYPH_WIDTH = CHECKBOX_WIDTH;

/** Whether a click landed on the checkbox glyph itself rather than the rest of the row (name,
 * status, description). Clicking the checkbox toggles selection; clicking elsewhere on the row
 * should only move the cursor there to preview it — reading an item's detail pane shouldn't
 * accidentally select it. `clickX` and `rowStartX` are both absolute terminal columns. */
export function isCheckboxClick(clickX: number, rowStartX: number, indent = 0): boolean {
  const start = rowStartX + indent;
  return clickX >= start && clickX < start + CHECKBOX_GLYPH_WIDTH;
}

/**
 * Columns each item row is indented by, so the category it belongs to reads as its parent.
 *
 * Category headers became checkable, which put a `[x]` on them at exactly the same column as every
 * item's — the two levels then looked like one flat list. Reported by the user: "the category
 * title is aligned with the items, hard to see, make it like treeview". Exported because the mouse
 * geometry has to agree with the rendering: an indented checkbox is two columns further right, and
 * a click that ignored that would toggle nothing.
 */
export const ITEM_INDENT = 2;

export type ItemStatusIndicator =
  | "satisfied"
  | "unsatisfied"
  | "needs-update"
  | "unknown"
  | "failed";

/**
 * The glyph an item shows, taking the last run's failures into account.
 *
 * Without this a failed install is indistinguishable on the list from one the user has merely
 * ticked and not applied yet: both are a checked box with no ✓. The checkbox itself stays checked,
 * and should — it means "this should be on my machine", which a failure does not change. What was
 * missing was any sign that the attempt had already been made and had failed.
 *
 * A failure is only shown while the entry is genuinely still absent. If it turns out to be present
 * afterwards the truth about the machine wins, so a stale failure can never contradict what is
 * actually installed.
 */
export function itemIndicator(
  key: string,
  snapshot: readonly DiagnosticSnapshotEntry[],
  failedKeys: ReadonlySet<string> = new Set(),
): ItemStatusIndicator {
  const state = statusIndicatorFor(key, snapshot);
  if (state === "unsatisfied" && failedKeys.has(key)) return "failed";
  return state;
}

/** "unknown" covers both "never scanned" (e.g. not applicable to this platform, §1.4 excludes it
 * from the snapshot entirely) and "scanned but errored" — neither has a real state to show. */
export function statusIndicatorFor(
  key: string,
  snapshot: readonly DiagnosticSnapshotEntry[],
): ItemStatusIndicator {
  const entry = snapshot.find((s) => s.key === key);
  if (entry === undefined || !entry.result.ok) return "unknown";
  return entry.result.state;
}

/** How much of a category is selected — drives the tri-state checkbox on its header row. */
export type CategorySelection = "all" | "some" | "none";

/**
 * Whether every, some, or none of a category's items are selected.
 *
 * "some" exists so the header can never claim a category is fully selected when it is not — a
 * plain checked/unchecked header would be a lie for any partially-selected category, and the user
 * would act on it.
 */
export function categorySelectionState(
  selection: ReadonlySet<string>,
  items: readonly ListItem[],
  category: string,
): CategorySelection {
  const inCategory = items.filter((i) => i.category === category);
  if (inCategory.length === 0) return "none";
  const selected = inCategory.filter((i) => selection.has(i.key)).length;
  if (selected === 0) return "none";
  return selected === inCategory.length ? "all" : "some";
}

/**
 * Toggles a whole category: selects all of it unless it is already fully selected, in which case
 * it clears it.
 *
 * A partially-selected category selects the rest rather than clearing, because "select the rest"
 * is additive and recoverable while the alternative silently discards choices the user made.
 * Only `items` given here are affected, so this respects an active search filter.
 */
export function toggleCategory(
  selection: ReadonlySet<string>,
  items: readonly ListItem[],
  category: string,
): Set<string> {
  const inCategory = items.filter((i) => i.category === category);
  const next = new Set(selection);
  if (categorySelectionState(selection, items, category) === "all") {
    for (const item of inCategory) next.delete(item.key);
  } else {
    for (const item of inCategory) next.add(item.key);
  }
  return next;
}

/** The category whose header renders at `row`, or undefined when that row is an item. */
export function rowToCategory(
  groups: readonly CategoryGroup[],
  row: number,
): string | undefined {
  if (row < 0) return undefined;
  let cursor = 0;
  for (const group of groups) {
    if (cursor === row) return group.category;
    cursor += 1 + group.items.length;
    if (cursor > row) return undefined; // the row falls inside this group's items
  }
  return undefined;
}

/**
 * Applies "space" at a given content row: a category header toggles the whole category, an item
 * toggles just itself.
 *
 * The cursor moves over rendered rows rather than over items, so that a category header can be
 * selected and acted on the same way as anything else in the list — reported by the user: "when I
 * navigate up and down, I should be able to select the section name to press space and install
 * all". Keeping the decision here rather than in the component keeps both branches testable.
 */
export function toggleAtRow(
  selection: ReadonlySet<string>,
  rows: readonly ContentRow[],
  rowIndex: number,
  visibleItems: readonly ListItem[],
): Set<string> {
  const row = rows[rowIndex];
  if (row === undefined) return new Set(selection);
  if (row.kind === "header") return toggleCategory(selection, visibleItems, row.category);

  const next = new Set(selection);
  if (next.has(row.item.key)) next.delete(row.item.key);
  else next.add(row.item.key);
  return next;
}

/** Keeps a row cursor inside the list. An empty list clamps to 0 rather than -1. */
export function clampRowIndex(index: number, rowCount: number): number {
  if (rowCount <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(Math.trunc(index), rowCount - 1));
}

/** The first row a cursor should rest on: the first *item*, so the detail pane has something to
 * show on the very first paint rather than opening on a bare category header. */
export function firstItemRow(rows: readonly ContentRow[]): number {
  const index = rows.findIndex((r) => r.kind === "item");
  return index === -1 ? 0 : index;
}

/**
 * A React key for one rendered row, unique among its siblings.
 *
 * Not the entry key: an entry belonging to several categories contributes a row to each, and those
 * rows are siblings inside one scroll window. React reuses an element when two siblings share a
 * key, which renders the wrong row's content — visible as artifacts while scrolling, worst when
 * scrolling fast because that is when re-renders come thickest. Measured on the real catalog: a
 * single 20-row window contained four colliding keys.
 *
 * Category plus entry id is unique by construction, since `categoriesFor` deduplicates so no entry
 * appears twice under one heading.
 */
export function rowKey(row: ContentRow): string {
  return row.kind === "header" ? `header:${row.category}` : `${row.item.category}/${row.item.key}`;
}
