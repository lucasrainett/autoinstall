import { assert, assertEquals } from "@std/assert";
import { scrollbarColumn, scrollbarGeometry } from "./scrollbar.ts";

Deno.test("scrollbarGeometry - at the top the thumb touches the top", () => {
  const { thumbStart } = scrollbarGeometry(86, 17, 0, 17);
  assertEquals(thumbStart, 0);
});

Deno.test("scrollbarGeometry - at the bottom the thumb touches the bottom", () => {
  // The property that matters most: a bar resting one row short of the bottom reads as "there is
  // still more below" and is worse than no bar at all. Checked across many sizes because it is a
  // rounding result, not an obvious one.
  for (const total of [20, 37, 86, 200, 999]) {
    for (const window of [5, 11, 17, 19]) {
      for (const height of [5, 11, 17, 19]) {
        if (window > total) continue;
        const { thumbStart, thumbSize } = scrollbarGeometry(total, window, total - window, height);
        assertEquals(
          thumbStart + thumbSize,
          height,
          `total=${total} window=${window} height=${height} left a gap at the bottom`,
        );
      }
    }
  }
});

Deno.test("scrollbarGeometry - the thumb never disappears on a very long list", () => {
  const { thumbSize } = scrollbarGeometry(10_000, 10, 0, 10);
  assert(thumbSize >= 1, "a thumb rounded down to zero rows would render an empty track");
});

Deno.test("scrollbarGeometry - the thumb never overflows the track", () => {
  for (const offset of [0, 1, 40, 69, 1000]) {
    const { thumbStart, thumbSize } = scrollbarGeometry(86, 17, offset, 17);
    assert(thumbStart >= 0, `negative thumbStart at offset ${offset}`);
    assert(thumbStart + thumbSize <= 17, `thumb overflowed the track at offset ${offset}`);
  }
});

Deno.test("scrollbarGeometry - a list that fits gets a full-height thumb", () => {
  // Reads as "this is all of it" rather than implying hidden content.
  assertEquals(scrollbarGeometry(10, 17, 0, 17), { thumbStart: 0, thumbSize: 17 });
});

Deno.test("scrollbarGeometry - the thumb is proportional to how much is visible", () => {
  // Half the content visible should fill about half the track — this is the information the old
  // "↓ more below" hint could not convey at all.
  const half = scrollbarGeometry(20, 10, 0, 10);
  assertEquals(half.thumbSize, 5);
  const tenth = scrollbarGeometry(100, 10, 0, 10);
  assertEquals(tenth.thumbSize, 1);
});

Deno.test("scrollbarGeometry - a zero-height track produces nothing rather than throwing", () => {
  assertEquals(scrollbarGeometry(86, 17, 4, 0), { thumbStart: 0, thumbSize: 0 });
});

Deno.test("scrollbarColumn - renders one character per row, thumb inside the track", () => {
  const column = scrollbarColumn(40, 10, 0, 10);
  assertEquals(column.length, 10);
  assertEquals(column.slice(0, 3), ["┃", "┃", "┃"]);
  assertEquals(column[9], "│");
});

Deno.test("scrollbarColumn - the thumb moves down as the list scrolls", () => {
  const top = scrollbarColumn(40, 10, 0, 10).indexOf("┃");
  const middle = scrollbarColumn(40, 10, 15, 10).indexOf("┃");
  const bottom = scrollbarColumn(40, 10, 30, 10).indexOf("┃");
  assert(top < middle && middle < bottom, `thumb did not advance: ${top}, ${middle}, ${bottom}`);
});
