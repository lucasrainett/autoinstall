import { assert, assertEquals } from "@std/assert";
import { formatScanProgress, progressBar, SPINNER_FRAMES, spinnerFrame } from "./spinner.ts";

Deno.test("spinnerFrame - cycles through every frame and wraps", () => {
  const seen = new Set<string>();
  for (let tick = 0; tick < SPINNER_FRAMES.length * 3; tick++) seen.add(spinnerFrame(tick));
  assertEquals(seen.size, SPINNER_FRAMES.length);
  assertEquals(spinnerFrame(0), spinnerFrame(SPINNER_FRAMES.length));
});

Deno.test("spinnerFrame - every frame is one character wide, so the line never jitters", () => {
  for (const frame of SPINNER_FRAMES) assertEquals([...frame].length, 1);
});

Deno.test("spinnerFrame - a nonsense tick still yields a frame rather than undefined", () => {
  // A timer that overflows or a NaN tick must not blank the indicator out.
  assert(spinnerFrame(Number.NaN).length > 0);
  assert(spinnerFrame(-3).length > 0);
  assert(spinnerFrame(Number.MAX_SAFE_INTEGER).length > 0);
});

Deno.test("formatScanProgress - reports count and percentage together", () => {
  assertEquals(formatScanProgress(34, 76), "diagnosing 34/76 (44%)"); // 44.7%, floored
});

Deno.test("formatScanProgress - starts at 0% and ends at 100%", () => {
  assertEquals(formatScanProgress(0, 76), "diagnosing 0/76 (0%)");
  assertEquals(formatScanProgress(76, 76), "diagnosing 76/76 (100%)");
});

Deno.test("formatScanProgress - never shows 100% before it is actually finished", () => {
  // Rounding up would show 100% with entries still to run, which is exactly the moment a user
  // decides the tool has hung.
  assertEquals(formatScanProgress(75, 76), "diagnosing 75/76 (98%)");
});

Deno.test("formatScanProgress - degenerate inputs do not produce NaN or >100%", () => {
  assertEquals(formatScanProgress(5, 0), "diagnosing…");
  assertEquals(formatScanProgress(99, 10), "diagnosing 10/10 (100%)");
  assertEquals(formatScanProgress(-1, 10), "diagnosing 0/10 (0%)");
});

Deno.test("progressBar - is always exactly the requested width", () => {
  // The bar sits inline with other text; a bar that changed length would make the rest of the
  // line jump about as the scan progressed.
  for (const done of [0, 1, 37, 75, 76]) {
    for (const width of [4, 8, 12, 20]) {
      assertEquals([...progressBar(done, 76, width)].length, width, `done=${done} w=${width}`);
    }
  }
});

Deno.test("progressBar - empty at the start and full at the end", () => {
  assertEquals(progressBar(0, 76, 8), "▱▱▱▱▱▱▱▱");
  assertEquals(progressBar(76, 76, 8), "▰▰▰▰▰▰▰▰");
});

Deno.test("progressBar - fills proportionally", () => {
  assertEquals(progressBar(38, 76, 8), "▰▰▰▰▱▱▱▱");
});

Deno.test("progressBar - degenerate inputs stay in bounds", () => {
  assertEquals(progressBar(5, 0, 4), "▱▱▱▱");
  assertEquals(progressBar(-3, 76, 4), "▱▱▱▱");
  assertEquals(progressBar(999, 76, 4), "▰▰▰▰");
  assertEquals(progressBar(1, 76, 0), "");
});

Deno.test("progressBar - uses only unambiguous-width characters", () => {
  // Shaded blocks (█ ▓ ░) are East-Asian Ambiguous and would render double-width in a
  // CJK-configured terminal, silently widening the row.
  const chars = new Set([...progressBar(3, 8, 8)]);
  for (const c of chars) assertEquals("▰▱".includes(c), true, `${c} is not a safe bar character`);
});
