import { assertEquals } from "@std/assert";
import {
  categorySelectionState,
  groupByCategory,
  rowToCategory,
  toggleCategory,
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

Deno.test("categorySelectionState - reports all, some, and none distinctly", () => {
  assertEquals(categorySelectionState(new Set(), items, "browsers"), "none");
  assertEquals(
    categorySelectionState(new Set(["brave"]), items, "browsers"),
    "some",
  );
  assertEquals(
    categorySelectionState(
      new Set(["brave", "zen"]),
      items,
      "browsers",
    ),
    "all",
  );
});

Deno.test("categorySelectionState - an unknown or empty category is 'none', not 'all'", () => {
  // Guards a vacuous-truth bug: "every item is selected" is trivially true of no items, which
  // would render a checked header for a category that contains nothing.
  assertEquals(categorySelectionState(new Set(), items, "gaming"), "none");
});

Deno.test("toggleCategory - checking a category selects everything in it", () => {
  // The reported request: check "browsers" to install all of them.
  const result = toggleCategory(new Set(), items, "browsers");
  assertEquals([...result].sort(), ["brave", "zen"]);
});

Deno.test("toggleCategory - never touches other categories", () => {
  const result = toggleCategory(new Set(["git"]), items, "browsers");
  assertEquals(result.has("git"), true);
});

Deno.test("toggleCategory - a fully selected category clears", () => {
  const all = new Set(["brave", "zen"]);
  assertEquals([...toggleCategory(all, items, "browsers")], []);
});

Deno.test("toggleCategory - a partly selected category fills up rather than clearing", () => {
  // Clearing here would silently discard a choice the user had already made; completing the set is
  // additive and trivially undone.
  const partial = new Set(["brave"]);
  const result = toggleCategory(partial, items, "browsers");
  assertEquals([...result].sort(), ["brave", "zen"]);
});

Deno.test("toggleCategory - respects an active filter by only seeing the items it is given", () => {
  const filtered = items.filter((i) => i.name === "Brave");
  const result = toggleCategory(new Set(), filtered, "browsers");
  assertEquals([...result], ["brave"]);
});

Deno.test("rowToCategory - identifies header rows and rejects item rows", () => {
  const groups = groupByCategory(items);
  // rows: 0 "browsers", 1 Brave, 2 Zen, 3 "dev-tools", 4 Git
  assertEquals(rowToCategory(groups, 0), "browsers");
  assertEquals(rowToCategory(groups, 1), undefined);
  assertEquals(rowToCategory(groups, 2), undefined);
  assertEquals(rowToCategory(groups, 3), "dev-tools");
  assertEquals(rowToCategory(groups, 4), undefined);
  assertEquals(rowToCategory(groups, 99), undefined);
});
