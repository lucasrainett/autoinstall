import { assert, assertEquals } from "@std/assert";
import { detailBudget } from "./detail-budget.ts";

/** Everything the pane would draw, given a budget — used to assert it never exceeds its height. */
function rowsUsed(b: ReturnType<typeof detailBudget>): number {
  return 3 + (b.description ? 1 : 0) + b.capabilityLines + (b.installMethod ? 1 : 0) +
    (b.runHint ? 1 : 0) + (b.website ? 1 : 0) + (b.notes ? 1 : 0);
}

Deno.test("detailBudget - never plans more rows than the pane has", () => {
  // The property that matters: Ink does not clip, so a pane taller than the layout budgeted pushes
  // every pane below it off the screen.
  for (let height = 3; height <= 40; height++) {
    for (const caps of [0, 1, 3, 8, 20]) {
      const b = detailBudget(height, caps);
      assert(rowsUsed(b) <= height, `height ${height}, ${caps} caps: used ${rowsUsed(b)}`);
    }
  }
});

Deno.test("detailBudget - a generous pane shows everything", () => {
  const b = detailBudget(20, 3);
  assertEquals(b.description, true);
  assertEquals(b.installMethod, true);
  assertEquals(b.runHint, true);
  assertEquals(b.website, true);
  assertEquals(b.notes, true);
  assert(b.capabilityLines >= 1);
});

Deno.test("detailBudget - a cramped pane drops notes and website before anything actionable", () => {
  // Notes are the longest and least often needed; the website is reference material. What you act
  // on — the description and the state — survives longest.
  const b = detailBudget(6, 2);
  assertEquals(b.notes, false, "notes should go first");
  assertEquals(b.description, true, "the description should outlast the notes");
});

Deno.test("detailBudget - the smallest possible pane still identifies the entry", () => {
  // 3 rows is the floor the layout can produce; name and state must survive even there.
  const b = detailBudget(3, 5);
  assertEquals(rowsUsed(b), 3);
  assertEquals(b.capabilityLines, 0);
});

Deno.test("detailBudget - capabilities never take more than half the remaining space", () => {
  // They are the only unbounded part; letting them dominate would push out everything else.
  const b = detailBudget(12, 60);
  assert(b.capabilityLines <= Math.floor((12 - 3 - 1) / 2), `took ${b.capabilityLines}`);
  assertEquals(b.installMethod || b.website || b.notes, true, "something else must survive");
});
