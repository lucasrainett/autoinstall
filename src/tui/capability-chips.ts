// Lays out an entry's capabilities as chips in the details pane.
//
// Kept out of the JSX because the details pane is the narrowest column in the interface and chip
// wrapping is exactly the kind of arithmetic that silently overflows it — a row one column too
// wide wraps, the pane renders more lines than the layout budgeted, and the whole interface
// shifts. That failure has happened here before, so the wrapping is a tested pure function rather
// than something Ink is trusted to get right.
//
// Capability keys are shown verbatim rather than prettified. They are the vocabulary the catalog,
// the `capabilities` task and any future search all speak, so seeing the real key is what lets
// someone go from "this is what I want" to finding the other entries that provide it.

/** Rendered form of one capability. */
export function chip(capability: string): string {
  return `[${capability}]`;
}

/**
 * Chips packed into lines no wider than `width`.
 *
 * A chip longer than the whole width still gets its own line rather than being dropped: losing a
 * capability silently would be worse than one over-long row, and it can only happen in a pane far
 * narrower than the layout permits.
 */
export function chipLines(
  capabilities: readonly string[],
  width: number,
  maxLines?: number,
): string[] {
  const pack = (items: readonly string[]): string[] => {
    const lines: string[] = [];
    let current = "";
    for (const capability of items) {
      const piece = chip(capability);
      if (current.length === 0) {
        current = piece;
      } else if (current.length + 1 + piece.length <= width) {
        current = `${current} ${piece}`;
      } else {
        lines.push(current);
        current = piece;
      }
    }
    if (current.length > 0) lines.push(current);
    return lines;
  };

  const all = pack(capabilities);
  if (maxLines === undefined || all.length <= maxLines) return all;

  // Over budget. Drop capabilities from the end until what remains, plus a "+N more" marker, fits
  // the allowance. Overflowing is not merely untidy: a pane taller than the layout budgeted pushes
  // everything below it off screen. Measured at 80x24, where the details pane is 10 rows and
  // Steam's eight capabilities took four chip lines.
  for (let shown = capabilities.length - 1; shown >= 1; shown--) {
    const marker = `+${capabilities.length - shown} more`;
    const lines = pack(capabilities.slice(0, shown));
    const last = lines.length - 1;
    if (lines[last].length + 1 + marker.length <= width) {
      lines[last] = `${lines[last]} ${marker}`;
    } else {
      lines.push(marker);
    }
    if (lines.length <= maxLines) return lines;
  }
  return [`+${capabilities.length} more`];
}
