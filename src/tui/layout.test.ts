import { assert, assertEquals } from "@std/assert";
import { computeLayout } from "./layout.ts";

Deno.test("computeLayout - a typical terminal size splits panes as expected", () => {
  // The list gets the larger share: it holds every catalog entry and is where selection happens,
  // whereas the detail pane shows a handful of lines about one entry. See layout.ts for why this
  // was flipped from the original 0.3.
  const layout = computeLayout({ columns: 100, rows: 40 });
  assertEquals(layout.categoryList, { x: 0, y: 0, width: 45, height: 32 });
  // The right column is split: details above, the always-visible plan below.
  assertEquals(layout.detail, { x: 45, y: 0, width: 55, height: 16 });
  assertEquals(layout.plan, { x: 45, y: 16, width: 55, height: 16 });
  assertEquals(layout.log, { x: 0, y: 32, width: 100, height: 8 });
});

Deno.test("computeLayout - the list stays wide enough for the longest entry name", () => {
  // A row is "  ", a two-column checkbox, a space and the name; the longest name in the catalog is
  // 26 characters, and the pane spends 4 more on its border and padding. Below this the names
  // truncate, which is the one thing the list must not do at a normal terminal size.
  const longestRow = 2 + 2 + 1 + 26 + 4;
  for (const columns of [80, 100, 120, 160]) {
    const layout = computeLayout({ columns, rows: 40 });
    assertEquals(
      layout.categoryList.width >= longestRow,
      true,
      `at ${columns} columns the list is ${layout.categoryList.width}, under ${longestRow}`,
    );
  }
});

Deno.test("computeLayout - the right column gets the larger share, since it stacks two panes", () => {
  // Details and plan share this column, and the plan's action lines are the longest text in the
  // interface. The list only ever holds a checkbox and a name.
  for (const columns of [80, 100, 120, 160]) {
    const layout = computeLayout({ columns, rows: 40 });
    assertEquals(
      layout.detail.width > layout.categoryList.width,
      true,
      `at ${columns} columns the right column (${layout.detail.width}) should exceed the list (${layout.categoryList.width})`,
    );
  }
});

Deno.test("computeLayout - detail pane width plus category list width always equals total columns", () => {
  const layout = computeLayout({ columns: 137, rows: 51 });
  assertEquals(layout.categoryList.width + layout.detail.width, 137);
});

Deno.test("computeLayout - top pane height plus log height always equals total rows", () => {
  const layout = computeLayout({ columns: 100, rows: 47 });
  assertEquals(layout.categoryList.height + layout.log.height, 47);
  assertEquals(layout.detail.height + layout.plan.height, layout.categoryList.height);
});

Deno.test("computeLayout - a tiny terminal never produces a pane below the minimum dimension", () => {
  const layout = computeLayout({ columns: 10, rows: 8 });
  assertEquals(layout.categoryList.width >= 3, true);
  assertEquals(layout.detail.width >= 3, true);
  assertEquals(layout.log.height >= 3, true);
  assertEquals(layout.categoryList.height >= 3, true);
});

Deno.test("computeLayout - custom ratios are honored", () => {
  const layout = computeLayout({ columns: 100, rows: 50 }, {
    categoryListWidthRatio: 0.5,
    logHeightRatio: 0.1,
  });
  assertEquals(layout.categoryList.width, 50);
  assertEquals(layout.log.height, 5);
});

Deno.test("computeLayout - the log pane always spans the full width, regardless of the category/detail split", () => {
  const layout = computeLayout({ columns: 120, rows: 40 });
  assertEquals(layout.log.width, 120);
  assertEquals(layout.log.x, 0);
});

Deno.test("computeLayout - panes never overlap: detail starts exactly where the category list ends", () => {
  const layout = computeLayout({ columns: 90, rows: 30 });
  assertEquals(layout.detail.x, layout.categoryList.x + layout.categoryList.width);
  assertEquals(layout.log.y, layout.categoryList.y + layout.categoryList.height);
});

Deno.test("computeLayout - the right column splits into details above and plan below", () => {
  const layout = computeLayout({ columns: 120, rows: 40 });
  assertEquals(layout.plan.x, layout.detail.x, "both panes share the right column");
  assertEquals(layout.plan.width, layout.detail.width);
  assertEquals(layout.plan.y, layout.detail.y + layout.detail.height, "plan sits directly below");
});

Deno.test("computeLayout - the two right-hand panes exactly fill the column, leaving no dead row", () => {
  // A rounding gap would show as an unexplained blank line between two bordered panes.
  for (const rows of [12, 24, 25, 40, 41, 60, 100]) {
    const layout = computeLayout({ columns: 120, rows });
    assertEquals(
      layout.detail.height + layout.plan.height,
      layout.categoryList.height,
      `rows=${rows}: right column does not fill the list's height`,
    );
  }
});

Deno.test("computeLayout - neither right-hand pane collapses on a small terminal", () => {
  for (const rows of [6, 8, 10, 12]) {
    const layout = computeLayout({ columns: 80, rows });
    assert(layout.detail.height >= 3, `rows=${rows}: details collapsed`);
    assert(layout.plan.height >= 3, `rows=${rows}: plan collapsed`);
  }
});

Deno.test("computeLayout - the split ratio is honoured on a roomy terminal", () => {
  const layout = computeLayout({ columns: 120, rows: 40 }, { detailHeightRatio: 0.25 });
  const top = layout.categoryList.height;
  assertEquals(layout.detail.height, Math.round(top * 0.25));
  assertEquals(layout.plan.height, top - layout.detail.height);
});
