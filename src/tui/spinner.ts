// Busy indicator + scan progress formatting — the testable half of the loading animation.
//
// Startup spawns one real subprocess per catalog entry and takes seconds, during which the
// interface showed one static line. Reported by the user: there was no way to tell work in
// progress from a hang.

/** Braille frames: they animate in place without changing width, so the line never jitters. */
export const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

/** Frame for a monotonically increasing tick. Wraps forever, and never returns undefined. */
export function spinnerFrame(tick: number): string {
  if (!Number.isFinite(tick)) return SPINNER_FRAMES[0];
  const index = Math.trunc(tick) % SPINNER_FRAMES.length;
  return SPINNER_FRAMES[index < 0 ? index + SPINNER_FRAMES.length : index];
}

/**
 * "diagnosing 34/76 (45%)".
 *
 * The count is shown alongside the percentage rather than instead of it: on a catalog this size a
 * percentage alone moves in visible jumps and reads as stuck, while the raw count always moves.
 */
export function formatScanProgress(done: number, total: number): string {
  if (total <= 0) return "diagnosing…";
  const clamped = Math.max(0, Math.min(done, total));
  const percent = Math.floor((clamped / total) * 100);
  return `diagnosing ${clamped}/${total} (${percent}%)`;
}

/** Bar characters, both East-Asian *Narrow* so the bar is exactly `width` columns in any terminal
 * — the shaded blocks (█ ▓ ░) are Ambiguous and would double in a CJK-configured terminal. */
const BAR_FILLED = "▰";
const BAR_EMPTY = "▱";

/**
 * A fixed-width progress bar: `▰▰▰▰▱▱▱▱`.
 *
 * Drawn rather than left to a bare percentage because the status line is one dim row among many
 * and was easy to miss entirely — reported by the user: "the diagnostics loading animation is not
 * very noticeable". A bar changes shape, which the eye catches without reading.
 */
export function progressBar(done: number, total: number, width: number): string {
  if (width <= 0) return "";
  if (total <= 0) return BAR_EMPTY.repeat(width);
  const clamped = Math.max(0, Math.min(done, total));
  const filled = Math.round((clamped / total) * width);
  return BAR_FILLED.repeat(filled) + BAR_EMPTY.repeat(width - filled);
}
