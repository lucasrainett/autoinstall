// Checkbox list component — TASKS.md §2. Thin Ink layer over the pure logic in checkbox-list.ts;
// this file itself is integration/manual, not unit-tested, per this project's convention.
// Keyboard handling goes through the shared input.ts map (listActions:true) rather than a local
// if/else chain, so every screen agrees on what "space"/"a"/"N" etc. mean. Mouse clicks go through
// the same input.ts geometry math (mouseClickToListIndex) plus checkbox-list.ts's own
// rowToItemIndex, which resolves a content row past the category headers to a flat item index —
// requires an ancestor <MouseProvider> (wired in App.tsx) or useOnClick throws.
//
// Scrolling: the caller passes `visibleRows` (how many content rows actually fit in the pane it
// gave this component); everything beyond that is sliced out of the render entirely rather than
// relying on Ink/Yoga to clip overflow — this component decides exactly what's on screen, so
// there's no dependency on terminal-rendering overflow behavior this project hasn't verified.

import { useEffect, useRef, useState } from "react";
import { Box, type DOMElement, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { scrollbarColumn } from "./scrollbar.ts";
import { categoryIcon, CHECKBOX, STATUS_EMOJI } from "./glyphs.ts";
import { getBoundingClientRect, useOnClick } from "@ink-tools/ink-mouse";
import {
  buildContentRows,
  categorySelectionState,
  clampRowIndex,
  computeScrollOffset,
  filterItems,
  firstItemRow,
  groupByCategory,
  isCheckboxClick,
  ITEM_INDENT,
  itemIndicator,
  type ItemStatusIndicator,
  type ListItem,
  rowKey,
  selectAllVisible,
  toggleAtRow,
  toggleCategory,
} from "./checkbox-list.ts";
import { mouseClickToListIndex, resolveKeyAction } from "./input.ts";
import type { DiagnosticSnapshotEntry } from "../diagnostics/scan.ts";

/** The search line is the one non-item row above the grouped content this component renders. */
const HEADER_ROWS = 1;

// No glyph for "installed and current": it is fully derivable from the two signals already on the
// row. A checked box that is not bold means "wanted, nothing to do" — i.e. present; an unchecked
// box that IS bold means a removal is planned — also present. Reported by the user: "the check is
// redundant as the [x] already shows that is installed, and bold shows is pending apply."
// The other glyphs stay, because none of them can be derived: an available update, a failure from
// the last run, and an entry that could not be checked all say something the checkbox cannot.
const STATUS_GLYPH: Record<ItemStatusIndicator, string> = STATUS_EMOJI;

export interface CheckboxListProps {
  items: readonly ListItem[];
  snapshot: readonly DiagnosticSnapshotEntry[];
  /** Entries that failed in the most recent run, so the list can say so rather than showing them
   * as merely "not installed" — indistinguishable from never having been attempted. */
  failedKeys?: ReadonlySet<string>;
  /** Entries the current plan would act on. Rendered bold, so what Enter is about to do is
   * visible in the list itself rather than only after opening the plan. */
  pendingKeys?: ReadonlySet<string>;
  selection: ReadonlySet<string>;
  onSelectionChange: (next: Set<string>) => void;
  /** How many content rows (search line excluded) actually fit in the space the caller gave this
   * component — drives which slice of the list is on screen. */
  visibleRows: number;
  /** Reports which item is currently highlighted, so a parent (e.g. a detail pane) can show it —
   * fires on mount and on every cursor move, not just clicks/selection changes. */
  onCursorChange?: (item: ListItem | undefined) => void;
  /** Reports the category when the cursor rests on a header row, so the detail pane can describe
   * the category instead of going blank. */
  onCursorCategoryChange?: (category: string | undefined) => void;
  /** Reports whether the search field currently owns keyboard input, so the parent can stand down
   * its own global bindings (notably Enter) while the user is typing a query. */
  onSearchModeChange?: (searching: boolean) => void;
}

export function CheckboxList(
  {
    items,
    snapshot,
    failedKeys,
    pendingKeys,
    selection,
    onSelectionChange,
    visibleRows,
    onCursorChange,
    onCursorCategoryChange,
    onSearchModeChange,
  }: CheckboxListProps,
) {
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const containerRef = useRef<DOMElement>(null);

  const visible = filterItems(items, search);
  const groups = groupByCategory(visible);
  const rows = buildContentRows(groups);
  // The cursor addresses a *rendered row*, not an item, so it can rest on a category header and
  // act on it — pressing space there selects the whole category.
  const cursorRow = clampRowIndex(cursor, rows.length);
  const currentRow = rows[cursorRow];
  const cursorItem = currentRow?.kind === "item" ? currentRow.item : undefined;

  // The scrollbar lives in a column rather than in rows, so the whole pane height is available for
  // content. The text hints it replaces ("↑ more above" / "↓ more below") cost two rows to convey
  // strictly less: that more existed, never how much or where in it you were.
  const canScroll = rows.length > visibleRows;
  const windowRows = visibleRows;

  function toggleRow(rowIndex: number) {
    onSelectionChange(toggleAtRow(selection, rows, rowIndex, visible));
  }

  useOnClick(containerRef, (event) => {
    const pane = getBoundingClientRect(containerRef.current);
    if (pane === undefined) return;
    const contentRow = mouseClickToListIndex({ x: event.x, y: event.y }, pane, {
      headerRows: HEADER_ROWS,
      scrollOffset,
    });
    if (contentRow === undefined) return;
    if (contentRow >= rows.length) return;
    const clicked = rows[contentRow];
    if (clicked === undefined) return;

    // Clicking anywhere on a row previews it (moves the cursor, updating the detail pane); only
    // clicking the checkbox glyph itself also toggles — reading an item's description by clicking
    // it shouldn't accidentally select it. A category header is all checkbox, since it has no
    // description to read.
    setCursor(contentRow);
    if (clicked.kind === "header") {
      onSelectionChange(toggleCategory(selection, visible, clicked.category));
      return;
    }
    if (isCheckboxClick(event.x, pane.x, ITEM_INDENT)) toggleRow(contentRow);
  });

  useEffect(() => {
    onCursorChange?.(cursorItem);
    onCursorCategoryChange?.(currentRow?.kind === "header" ? currentRow.category : undefined);
    // deliberately keyed on the item's key list, not the array reference, since filtering
    // produces a new array every render even when its contents haven't changed
  }, [cursorRow, visible.map((i) => i.key).join(",")]);

  // Start on the first item rather than the category header above it, so the detail pane has
  // something to show on the very first paint. Only ever runs while the cursor is still untouched
  // at the top, so it can never yank the cursor away from the user mid-session.
  useEffect(() => {
    if (cursor === 0 && rows.length > 0) setCursor(firstItemRow(rows));
  }, [rows.length === 0]);

  useEffect(() => {
    // Re-keeps the cursor in view whenever it moves, the list's shape changes (search narrows
    // it), or the caller's available height changes (a terminal resize) — same effect, one place.
    setScrollOffset((prev) => computeScrollOffset(cursorRow, prev, windowRows, rows.length));
  }, [cursorRow, rows.length, windowRows]);

  // Search is an explicit mode ("/" to enter, Esc to leave) rather than plain type-to-filter.
  // Type-to-filter cannot work here: the list bindings claim "a" (select-all), " " (toggle) and
  // "N" (deselect-all) before any character reaches the query, so words like "terraform", "aws"
  // or "proton mail" were literally impossible to type — worse, the "a" in "terraform" silently
  // ran select-all instead. Confirmed by real pty testing, not just by reading the code.
  useInput((input, key) => {
    // Keyboard equivalent of clicking a category header. The cursor moves between items only, so
    // without this a keyboard user could not reach the header at all.
    if (!searching && input === "c") {
      const category = currentRow === undefined
        ? undefined
        : currentRow.kind === "header"
        ? currentRow.category
        : currentRow.item.category;
      if (category !== undefined) {
        onSelectionChange(toggleCategory(selection, visible, category));
      }
      return;
    }

    if (searching) {
      if (key.escape) {
        setSearching(false);
        onSearchModeChange?.(false);
        return;
      }
      // Enter leaves the field with the filter still applied, so the parent's Enter binding
      // (review & apply) can't fire on the same keystroke that ends the search.
      if (key.return) {
        setSearching(false);
        onSearchModeChange?.(false);
        return;
      }
      if (key.backspace || key.delete) {
        setSearch((s) => s.slice(0, -1));
        return;
      }
      // Ink delivers whatever arrived in one stdin read, so this is not always a single
      // character — fast typing and pasting both produce multi-character chunks. Filtering to
      // printable characters (rather than requiring length 1) is what makes those work; the old
      // single-character guard silently dropped them.
      if (input && !key.ctrl && !key.meta) {
        const printable = [...input].filter((c) => c >= " " && c !== "\x7f").join("");
        if (printable.length > 0) setSearch((s) => s + printable);
      }
      return;
    }

    if (input === "/") {
      setSearching(true);
      onSearchModeChange?.(true);
      return;
    }

    const action = resolveKeyAction({ input, ...key }, { listActions: true });
    switch (action) {
      case "moveUp":
        // Functional updates, not `cursorRow + 1`: that closes over the value from the render this
        // handler was created in, so two keypresses inside one render batch both compute from the
        // same starting point and one of them is lost. Held keys and fast navigation do exactly
        // that.
        setCursor((c) => Math.max(0, clampRowIndex(c, rows.length) - 1));
        return;
      case "moveDown":
        setCursor((c) => Math.min(rows.length - 1, clampRowIndex(c, rows.length) + 1));
        return;
      case "toggleSelect":
        toggleRow(cursorRow);
        return;
      case "selectAll":
        onSelectionChange(selectAllVisible(selection, visible));
        return;
      case "backspace":
        setSearch((s) => s.slice(0, -1));
        return;
    }
  });

  const visibleWindow = rows.slice(scrollOffset, scrollOffset + windowRows);
  // Selection spans the whole catalog, not just what's on screen or matching the filter — without
  // this count you can select things, scroll or filter away, and have no idea what's queued up.
  const selectedCount = selection.size;
  const position = visible.length === 0 ? "none matching" : currentRow?.kind === "header"
    ? (() => {
      const n = visible.filter((i) => i.category === currentRow.category).length;
      return `${currentRow.category} — ${n} entr${n === 1 ? "y" : "ies"}`;
    })()
    : `${(cursorItem === undefined ? 0 : visible.indexOf(cursorItem) + 1)} of ${visible.length}${
      search ? " matching" : ""
    }`;
  // Distinguishes "the filter matched nothing" from "the catalog has not loaded yet". Both are
  // empty lists, but the first paint of every launch hits the second case, and telling a user to
  // "press backspace to edit" a search term they never typed is a wrong message at the worst
  // possible moment.
  const isEmpty = visible.length === 0;

  return (
    <Box ref={containerRef} flexDirection="column">
      <Box>
        <Text dimColor={!searching}>/</Text>
        {searching
          ? (
            // Delegated rather than hand-rolled: the previous implementation required
            // single-character input and silently dropped multi-character chunks, so fast typing
            // and every paste were lost. It also gains cursor movement and mid-string editing.
            <TextInput
              value={search}
              onChange={setSearch}
              onSubmit={() => {
                setSearching(false);
                onSearchModeChange?.(false);
              }}
            />
          )
          : <Text dimColor>{search.length > 0 ? search : "(press / to search)"}</Text>}
        <Text dimColor>{`  [${position}]`}</Text>
        {selectedCount > 0 && <Text color="green" bold>{`  ${selectedCount} selected`}</Text>}
      </Box>
      {isEmpty
        ? (
          <Text color="yellow">
            {search.length > 0
              ? `No entries match “${search}” — press backspace to edit, or Esc to clear the filter.`
              : "Loading the catalog…"}
          </Text>
        )
        : (
          // Two columns: the list, then the scrollbar. flexGrow on the list column keeps the bar
          // pinned to the right edge of the pane at any terminal width.
          <Box flexDirection="row">
            <Box flexDirection="column" flexGrow={1}>
              {visibleWindow.map((row, i) => {
                if (row.kind === "header") {
                  // A category is checkable in its own right: checking "browsers" selects every
                  // browser. The middle state matters — a plain checked/unchecked header would
                  // claim a partly-selected category was fully selected, and the user would act
                  // on that.
                  const state = categorySelectionState(selection, visible, row.category);
                  const box = state === "all"
                    ? CHECKBOX.checked
                    : state === "some"
                    ? CHECKBOX.partial
                    : CHECKBOX.unchecked;
                  // Bold when this category contains something the plan would act on, so a
                  // collapsed-looking list still shows where the pending work is.
                  const hasPending = pendingKeys !== undefined &&
                    visible.some((it) => it.category === row.category && pendingKeys.has(it.key));
                  return (
                    <Text
                      key={rowKey(row)}
                      bold
                      wrap="truncate"
                      color={hasPending ? "cyan" : "gray"}
                      inverse={scrollOffset + i === cursorRow}
                    >
                      {box} {categoryIcon(row.category)} {row.category}
                    </Text>
                  );
                }
                const status = itemIndicator(row.item.key, snapshot, failedKeys);
                return (
                  <Text
                    key={rowKey(row)}
                    // Truncate rather than wrap: a row wider than the pane would otherwise grow
                    // the row box, pushing the scrollbar column — and with it the pane border —
                    // sideways as that row scrolled into view. Reported by the user as the border
                    // shifting while scrolling.
                    wrap="truncate"
                    inverse={scrollOffset + i === cursorRow}
                    bold={pendingKeys?.has(row.item.key) ?? false}
                  >
                    {" ".repeat(ITEM_INDENT)}
                    {selection.has(row.item.key) ? CHECKBOX.checked : CHECKBOX.unchecked}{" "}
                    {row.item.name}
                    {STATUS_GLYPH[status] === "" ? "" : ` ${STATUS_GLYPH[status]}`}
                  </Text>
                );
              })}
            </Box>
            {canScroll
              ? (
                <Box flexDirection="column" flexShrink={0} width={1}>
                  {scrollbarColumn(rows.length, windowRows, scrollOffset, visibleWindow.length).map(
                    (char: string, i: number) => (
                      // The thumb is the bright part; the track stays dim so the bar reads as a
                      // guide rather than competing with the entry names beside it.
                      <Text
                        key={i}
                        dimColor={char !== "┃"}
                        color={char === "┃" ? "cyan" : undefined}
                      >
                        {char}
                      </Text>
                    ),
                  )}
                </Box>
              )
              : null}
          </Box>
        )}
    </Box>
  );
}
