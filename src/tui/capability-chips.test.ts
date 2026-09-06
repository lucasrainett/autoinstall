import { assertEquals } from "@std/assert";
import { chip, chipLines } from "./capability-chips.ts";

Deno.test("chip - a capability is shown as its real key, not a prettified label", () => {
  // The key is the vocabulary the catalog and the coverage report both speak; showing "3D
  // slicing" would leave the reader unable to look the capability up anywhere.
  assertEquals(chip("3d-slicing"), "[3d-slicing]");
});

Deno.test("chipLines - packs several chips onto one line when they fit", () => {
  assertEquals(chipLines(["a", "b"], 20), ["[a] [b]"]);
});

Deno.test("chipLines - wraps rather than exceeding the width", () => {
  // The details pane is the narrowest column; a row one column too wide wraps, the pane renders
  // more lines than the layout budgeted, and the interface shifts.
  const lines = chipLines(["video-playback", "music-playback"], 20);
  assertEquals(lines, ["[video-playback]", "[music-playback]"]);
  for (const line of lines) assertEquals(line.length <= 20, true, `too wide: ${line}`);
});

Deno.test("chipLines - an over-long capability gets its own line rather than being dropped", () => {
  // Losing a capability silently is worse than one over-long row.
  assertEquals(chipLines(["a-very-long-capability-key"], 8), ["[a-very-long-capability-key]"]);
});

Deno.test("chipLines - no capabilities produces no lines, not an empty one", () => {
  // An empty line would still consume a row of the pane's height budget.
  assertEquals(chipLines([], 40), []);
});

Deno.test("chipLines - every capability survives the layout", () => {
  const caps = ["email", "calendar", "contacts", "task-management", "messaging"];
  const joined = chipLines(caps, 24).join(" ");
  for (const c of caps) assertEquals(joined.includes(`[${c}]`), true, `lost ${c}`);
});

Deno.test("chipLines - respects a line budget rather than overflowing the pane", () => {
  // A pane taller than the layout budgeted does not clip, it pushes everything below it off
  // screen. Reported by the user as the list going out of bounds; measured at 80x24, where the
  // details pane is 10 rows and eight capabilities took four chip lines.
  const caps = ["a", "b", "c", "d", "e", "f", "g", "h"];
  for (const budget of [1, 2, 3]) {
    assertEquals(chipLines(caps, 20, budget).length <= budget, true, `budget ${budget} exceeded`);
  }
});

Deno.test("chipLines - says how many capabilities it had to hide", () => {
  // Silently dropping them would misreport what the software does, which is the one thing this
  // display exists to get right.
  const lines = chipLines(["a", "b", "c", "d", "e", "f"], 20, 1);
  assertEquals(lines.length, 1);
  const shown = lines[0].split("[").length - 1;
  assertEquals(lines[0].includes(`+${6 - shown} more`), true, lines[0]);
});

Deno.test("chipLines - a budget it already fits within changes nothing", () => {
  assertEquals(chipLines(["a", "b"], 40, 5), ["[a] [b]"]);
});

Deno.test("chipLines - every line stays inside the width, even with the marker", () => {
  const caps = Array.from({ length: 12 }, (_, i) => `capability-${i}`);
  for (const line of chipLines(caps, 30, 2)) {
    assertEquals(line.length <= 30, true, `too wide: ${line}`);
  }
});
