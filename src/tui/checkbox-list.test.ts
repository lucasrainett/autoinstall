import { assertEquals } from "@std/assert";
import {
  buildContentRows,
  type CategoryGroup,
  computeScrollOffset,
  filterItems,
  groupByCategory,
  isCheckboxClick,
  itemIndexToRow,
  type ListItem,
  rowToItemIndex,
  selectAllVisible,
  statusIndicatorFor,
} from "./checkbox-list.ts";
import type { DiagnosticSnapshotEntry } from "../diagnostics/scan.ts";

const ITEMS: ListItem[] = [
  {
    key: "communication/install/signal",
    category: "communication",
    name: "Signal",
    description: "encrypted messaging",
  },
  {
    key: "browsers/install/zen-browser",
    category: "browsers",
    name: "Zen Browser",
    description: "privacy-first browser",
  },
  {
    key: "privacy/configure/disable-telemetry",
    category: "privacy",
    name: "Disable Telemetry",
    description: "turn off diagnostics",
  },
];

Deno.test("filterItems - an empty search term returns every item", () => {
  assertEquals(filterItems(ITEMS, ""), ITEMS);
  assertEquals(filterItems(ITEMS, "   "), ITEMS);
});

Deno.test("filterItems - matches by name, case-insensitively", () => {
  assertEquals(filterItems(ITEMS, "signal"), [ITEMS[0]]);
  assertEquals(filterItems(ITEMS, "SIGNAL"), [ITEMS[0]]);
});

Deno.test("filterItems - matches by description", () => {
  assertEquals(filterItems(ITEMS, "diagnostics"), [ITEMS[2]]);
});

Deno.test("filterItems - matches by category", () => {
  assertEquals(filterItems(ITEMS, "browsers"), [ITEMS[1]]);
});

Deno.test("filterItems - no match returns an empty list, not an error", () => {
  assertEquals(filterItems(ITEMS, "nonexistent-xyz"), []);
});

Deno.test("groupByCategory - groups items under their category, preserving first-seen order", () => {
  const groups = groupByCategory(ITEMS);
  assertEquals(groups.map((g) => g.category), ["communication", "browsers", "privacy"]);
  assertEquals(groups[0].items, [ITEMS[0]]);
});

Deno.test("groupByCategory - multiple items in the same category are grouped together", () => {
  const extra: ListItem = {
    key: "communication/install/beeper",
    category: "communication",
    name: "Beeper",
    description: "x",
  };
  const groups = groupByCategory([...ITEMS, extra]);
  const communication = groups.find((g) => g.category === "communication")!;
  assertEquals(communication.items.length, 2);
});

Deno.test("selectAllVisible - adds every visible item, leaves other selections untouched", () => {
  const visible = filterItems(ITEMS, "signal"); // just Signal
  const result = selectAllVisible(new Set(["privacy/configure/disable-telemetry"]), visible);
  assertEquals(
    result,
    new Set(["privacy/configure/disable-telemetry", "communication/install/signal"]),
  );
});

Deno.test("statusIndicatorFor - maps a satisfied snapshot entry", () => {
  const snapshot: DiagnosticSnapshotEntry[] = [
    { key: "communication/install/signal", result: { ok: true, state: "satisfied" } },
  ];
  assertEquals(statusIndicatorFor("communication/install/signal", snapshot), "satisfied");
});

Deno.test("statusIndicatorFor - maps unsatisfied and needs-update the same way", () => {
  const snapshot: DiagnosticSnapshotEntry[] = [
    { key: "a", result: { ok: true, state: "unsatisfied" } },
    { key: "b", result: { ok: true, state: "needs-update" } },
  ];
  assertEquals(statusIndicatorFor("a", snapshot), "unsatisfied");
  assertEquals(statusIndicatorFor("b", snapshot), "needs-update");
});

Deno.test("statusIndicatorFor - an item missing from the snapshot entirely is unknown, not guessed", () => {
  assertEquals(statusIndicatorFor("communication/install/signal", []), "unknown");
});

Deno.test("statusIndicatorFor - an errored diagnostic result is unknown, not silently treated as a real state", () => {
  const snapshot: DiagnosticSnapshotEntry[] = [
    { key: "communication/install/signal", result: { ok: false, error: "detect script threw" } },
  ];
  assertEquals(statusIndicatorFor("communication/install/signal", snapshot), "unknown");
});

// Rendered rows for these groups: 0="A" header, 1=a1, 2=a2, 3="B" header, 4=b1.
const GROUPS: CategoryGroup[] = [
  {
    category: "A",
    items: [{ key: "a1", category: "A", name: "a1", description: "" }, {
      key: "a2",
      category: "A",
      name: "a2",
      description: "",
    }],
  },
  { category: "B", items: [{ key: "b1", category: "B", name: "b1", description: "" }] },
];

Deno.test("rowToItemIndex - a category header row maps to undefined, not an item", () => {
  assertEquals(rowToItemIndex(GROUPS, 0), undefined); // "A" header
  assertEquals(rowToItemIndex(GROUPS, 3), undefined); // "B" header
});

Deno.test("rowToItemIndex - item rows map to their flat index in visible-item order", () => {
  assertEquals(rowToItemIndex(GROUPS, 1), 0); // a1
  assertEquals(rowToItemIndex(GROUPS, 2), 1); // a2
  assertEquals(rowToItemIndex(GROUPS, 4), 2); // b1
});

Deno.test("rowToItemIndex - negative or past-the-end rows are undefined, not a crash or wraparound", () => {
  assertEquals(rowToItemIndex(GROUPS, -1), undefined);
  assertEquals(rowToItemIndex(GROUPS, 5), undefined);
  assertEquals(rowToItemIndex(GROUPS, 100), undefined);
});

Deno.test("rowToItemIndex - an empty group list has no rows to map", () => {
  assertEquals(rowToItemIndex([], 0), undefined);
});

Deno.test("rowToItemIndex - a single group with no items is just its header row", () => {
  const groups: CategoryGroup[] = [{ category: "Empty", items: [] }];
  assertEquals(rowToItemIndex(groups, 0), undefined);
  assertEquals(rowToItemIndex(groups, 1), undefined);
});

// A row renders "[X] G Name" — the checkbox glyph "[X]" occupies the row's first 3 columns.
Deno.test("isCheckboxClick - a click on either column of the checkbox is a checkbox click", () => {
  // The checkbox is an emoji, which is two columns wide — not the three that "[x]" occupied.
  // Hit-testing reads its width from glyphs.ts, so the two can never drift apart.
  assertEquals(isCheckboxClick(10, 10), true); // left half of the glyph
  assertEquals(isCheckboxClick(11, 10), true); // right half
});

Deno.test("isCheckboxClick - a click past the checkbox (status glyph, name, description) is not", () => {
  assertEquals(isCheckboxClick(12, 10), false); // the space after the glyph
  assertEquals(isCheckboxClick(20, 10), false); // well into the item name
});

Deno.test("isCheckboxClick - a click before the row's own start (e.g. on a sibling pane) is not", () => {
  assertEquals(isCheckboxClick(9, 10), false);
});

Deno.test("itemIndexToRow - is the exact inverse of rowToItemIndex for every real item row", () => {
  for (const row of [1, 2, 4]) {
    const itemIndex = rowToItemIndex(GROUPS, row);
    assertEquals(itemIndex !== undefined, true);
    assertEquals(itemIndexToRow(GROUPS, itemIndex!), row);
  }
});

Deno.test("itemIndexToRow - past-the-end or negative indices are undefined", () => {
  assertEquals(itemIndexToRow(GROUPS, -1), undefined);
  assertEquals(itemIndexToRow(GROUPS, 3), undefined); // only 3 items total (a1, a2, b1)
});

Deno.test("buildContentRows - produces one descriptor per row, in the same order rowToItemIndex assumes", () => {
  const rows = buildContentRows(GROUPS);
  assertEquals(rows.map((r) => r.kind), ["header", "item", "item", "header", "item"]);
  assertEquals(rows[1].kind === "item" ? rows[1].item.key : undefined, "a1");
  assertEquals(rows[1].kind === "item" ? rows[1].itemIndex : undefined, 0);
  assertEquals(rows[4].kind === "item" ? rows[4].item.key : undefined, "b1");
  assertEquals(rows[4].kind === "item" ? rows[4].itemIndex : undefined, 2);
});

Deno.test("buildContentRows - an empty group list produces no rows", () => {
  assertEquals(buildContentRows([]), []);
});

Deno.test("computeScrollOffset - leaves the offset alone when the cursor is already within view", () => {
  assertEquals(computeScrollOffset(5, 3, 4, 20), 3);
});

Deno.test("computeScrollOffset - scrolls up to the cursor when it moved above the window", () => {
  assertEquals(computeScrollOffset(2, 5, 4, 20), 2);
});

Deno.test("computeScrollOffset - scrolls down the minimum amount to keep the cursor at the window's bottom edge", () => {
  // viewport [3,7), cursor jumps to row 9 -> new window must end just past 9, i.e. start at 6
  assertEquals(computeScrollOffset(9, 3, 4, 20), 6);
});

Deno.test("computeScrollOffset - never scrolls past the point where the last row is at the bottom", () => {
  // 10 total rows, viewport height 4 -> max useful offset is 6 (rows 6..9 fill the window exactly)
  assertEquals(computeScrollOffset(9, 0, 4, 10), 6);
});

Deno.test("computeScrollOffset - clamps to zero when everything fits (more viewport than content)", () => {
  assertEquals(computeScrollOffset(2, 0, 20, 5), 0);
});

Deno.test("computeScrollOffset - a non-positive viewport height is always offset zero", () => {
  assertEquals(computeScrollOffset(5, 3, 0, 20), 0);
});

Deno.test("isCheckboxClick - an indented row's checkbox sits ITEM_INDENT columns further right", () => {
  // Items are indented so their category header reads as a parent. The click geometry has to
  // agree with the rendering, or clicking a checkbox toggles nothing.
  assertEquals(isCheckboxClick(10, 10, 2), false); // blank indent, not the glyph
  assertEquals(isCheckboxClick(12, 10, 2), true); // left half of the glyph
  assertEquals(isCheckboxClick(13, 10, 2), true); // right half
  assertEquals(isCheckboxClick(14, 10, 2), false); // the space after it
});

Deno.test("isCheckboxClick - an un-indented row (a category header) is unchanged", () => {
  assertEquals(isCheckboxClick(10, 10), true);
  assertEquals(isCheckboxClick(10, 10, 0), true);
});
