// Scrollbar geometry — pure, so the arithmetic can be tested without a terminal.
//
// This replaces the "↑ more above" / "↓ more below" text hints. Those said only *that* more
// content existed, never how much or where you were in it: two hidden entries and sixty looked
// identical. They also cost two content rows, which a column-based bar hands back.
//
// It is deliberately a real scrollbar rather than a decorative one. The inputs needed to be
// accurate — offset, window height, total rows — are all already known at the call site, so a bar
// that merely implied "there is more" would take the same work and then lie about the proportion
// as soon as the list was filtered.

export interface ScrollbarGeometry {
  /** Row index within the track where the thumb starts. */
  thumbStart: number;
  /** Height of the thumb in rows; always at least 1 so it can never vanish. */
  thumbSize: number;
}

/**
 * Where the thumb sits in a track `height` rows tall, for a viewport of `windowRows` over
 * `totalRows` of content scrolled to `offset`.
 *
 * Two properties matter more than exact proportion, because they are what a reader actually
 * checks: at `offset` 0 the thumb touches the top, and at maximum offset it touches the bottom.
 * Rounding is arranged so both hold at any size — a bar that stops one row short of the bottom
 * reads as "there is still more below" and would be worse than no bar at all.
 */
export function scrollbarGeometry(
  totalRows: number,
  windowRows: number,
  offset: number,
  height: number,
): ScrollbarGeometry {
  if (height <= 0) return { thumbStart: 0, thumbSize: 0 };
  // Nothing to scroll: a full-height thumb, which reads as "this is all of it".
  if (totalRows <= windowRows || totalRows <= 0) return { thumbStart: 0, thumbSize: height };

  const proportion = windowRows / totalRows;
  const thumbSize = Math.max(1, Math.min(height, Math.round(height * proportion)));

  const maxOffset = totalRows - windowRows;
  const clampedOffset = Math.max(0, Math.min(offset, maxOffset));
  const travel = height - thumbSize;
  const thumbStart = maxOffset === 0 ? 0 : Math.round((clampedOffset / maxOffset) * travel);

  return { thumbStart: Math.max(0, Math.min(thumbStart, travel)), thumbSize };
}

/**
 * The track as one character per row, ready to render as a column.
 *
 * Half-block characters are used rather than a full block so the bar reads as a scrollbar instead
 * of a solid wall of colour next to the list.
 */
export function scrollbarColumn(
  totalRows: number,
  windowRows: number,
  offset: number,
  height: number,
  chars: { thumb: string; track: string } = { thumb: "┃", track: "│" },
): string[] {
  const { thumbStart, thumbSize } = scrollbarGeometry(totalRows, windowRows, offset, height);
  return Array.from(
    { length: Math.max(0, height) },
    (_, row) => row >= thumbStart && row < thumbStart + thumbSize ? chars.thumb : chars.track,
  );
}
