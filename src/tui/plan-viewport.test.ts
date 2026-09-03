import { assert, assertEquals } from "@std/assert";
import { clampPlanScroll, planViewport } from "./plan-viewport.ts";

Deno.test("planViewport - a short plan needs no scrolling and keeps room for the prompt", () => {
  const view = planViewport(5, 20);
  assertEquals(view.scrollable, false);
  assert(view.contentRows >= 5, "a plan that fits must not be clipped");
  assert(view.contentRows < 20, "the Proceed prompt must still have a row");
});

Deno.test("planViewport - a long plan never draws more rows than the pane has", () => {
  // The reported bug: the pane had no height limit, so a tall plan pushed the rest of the
  // interface off screen. Every combination must leave room for the prompt and the indicator.
  for (const rows of [4, 8, 12, 24, 40]) {
    for (const lines of [1, 5, 41, 120, 1000]) {
      const view = planViewport(lines, rows);
      const chrome = view.scrollable ? 2 : 1;
      assert(
        view.contentRows + chrome <= rows || view.contentRows === 1,
        `contentRows=${view.contentRows} + chrome=${chrome} exceeded rows=${rows}`,
      );
    }
  }
});

Deno.test("planViewport - a 41-action plan in a short pane is scrollable, not truncated silently", () => {
  // 41 actions is the real number from the user's report.
  const view = planViewport(45, 12);
  assertEquals(view.scrollable, true);
  assert(view.contentRows > 0);
});

Deno.test("planViewport - a tiny pane still yields at least one readable row", () => {
  const view = planViewport(50, 1);
  assert(view.contentRows >= 1, "a degenerate pane must not produce a zero-row viewport");
});

Deno.test("clampPlanScroll - paging past the end stops at the last screenful", () => {
  // 45 lines, 10 rows visible => the furthest useful offset is 35, which still fills the window.
  assertEquals(clampPlanScroll(999, 45, 10), 35);
});

Deno.test("clampPlanScroll - scrolling above the top stops at the top", () => {
  assertEquals(clampPlanScroll(-5, 45, 10), 0);
});

Deno.test("clampPlanScroll - a plan shorter than the window cannot scroll at all", () => {
  assertEquals(clampPlanScroll(7, 5, 10), 0);
});

Deno.test("clampPlanScroll - a non-finite offset degrades to the top rather than NaN", () => {
  assertEquals(clampPlanScroll(Number.NaN, 45, 10), 0);
  assertEquals(clampPlanScroll(Number.POSITIVE_INFINITY, 45, 10), 0);
});

Deno.test("clampPlanScroll - the last line of a plan is always reachable", () => {
  // The safety property: no action may be unreachable, or the user could approve something they
  // were never able to read.
  for (const lines of [2, 41, 45, 300]) {
    for (const rows of [1, 3, 10, 40]) {
      const offset = clampPlanScroll(Number.MAX_SAFE_INTEGER, lines, rows);
      assert(
        offset + rows >= lines,
        `lines=${lines} rows=${rows}: last line unreachable at max offset ${offset}`,
      );
    }
  }
});
