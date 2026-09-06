import { assertEquals } from "@std/assert";
import {
  buildContentRows,
  clampRowIndex,
  firstItemRow,
  groupByCategory,
  toggleAtRow,
} from "./checkbox-list.ts";
import type { ListItem } from "./checkbox-list.ts";

const items: ListItem[] = [
  {
    key: "brave",
    category: "browsers",
    categories: ["browsers"],
    capabilities: [],
    name: "Brave",
    description: "",
  },
  {
    key: "zen",
    category: "browsers",
    categories: ["browsers"],
    capabilities: [],
    name: "Zen",
    description: "",
  },
  {
    key: "git",
    category: "dev-tools",
    categories: ["dev-tools"],
    capabilities: [],
    name: "Git",
    description: "",
  },
];
const rows = buildContentRows(groupByCategory(items));
// rows: 0 header(browsers), 1 Brave, 2 Zen, 3 header(dev-tools), 4 Git

Deno.test("toggleAtRow - space on a category header selects the whole category", () => {
  // The reported request: navigate to the section name, press space, install all of it.
  const result = toggleAtRow(new Set(), rows, 0, items);
  assertEquals([...result].sort(), ["brave", "zen"]);
});

Deno.test("toggleAtRow - space on a header of a fully selected category clears it", () => {
  const all = new Set(["brave", "zen"]);
  assertEquals([...toggleAtRow(all, rows, 0, items)], []);
});

Deno.test("toggleAtRow - space on an item toggles only that item", () => {
  const result = toggleAtRow(new Set(), rows, 1, items);
  assertEquals([...result], ["brave"]);
  assertEquals([...toggleAtRow(result, rows, 1, items)], []);
});

Deno.test("toggleAtRow - a header only ever affects its own category", () => {
  const result = toggleAtRow(new Set(["git"]), rows, 0, items);
  assertEquals(result.has("git"), true);
  assertEquals(result.size, 3);
});

Deno.test("toggleAtRow - an out-of-range row changes nothing", () => {
  const before = new Set(["git"]);
  assertEquals([...toggleAtRow(before, rows, 99, items)], ["git"]);
  assertEquals([...toggleAtRow(before, rows, -1, items)], ["git"]);
});

Deno.test("clampRowIndex - keeps the cursor inside the list", () => {
  assertEquals(clampRowIndex(-5, 5), 0);
  assertEquals(clampRowIndex(99, 5), 4);
  assertEquals(clampRowIndex(2, 5), 2);
});

Deno.test("clampRowIndex - an empty list clamps to 0, never -1", () => {
  // -1 would index past the start of the row array and highlight nothing at all.
  assertEquals(clampRowIndex(3, 0), 0);
  assertEquals(clampRowIndex(Number.NaN, 5), 0);
});

Deno.test("firstItemRow - starts on the first item, not the category header above it", () => {
  // Opening on a bare header would leave the detail pane empty on the very first paint.
  assertEquals(firstItemRow(rows), 1);
});

Deno.test("firstItemRow - a list with no items at all falls back to the top", () => {
  assertEquals(firstItemRow([]), 0);
});
