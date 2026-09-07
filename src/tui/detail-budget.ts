// Decides what the details pane can afford to draw.
//
// The pane has a fixed height from the layout, and Ink does not clip: content taller than the box
// makes the box taller, which pushes every pane below it off the screen. So the pane cannot simply
// render everything and hope — it has to know what fits.
//
// Every line here is optional except the ones a row is useless without: the name and the installed
// state. The rest is dropped in reverse order of usefulness when space is short, so a 60x16
// terminal shows a usable summary rather than a broken layout. Notes go first because they are the
// longest and the least often needed; the website goes early too, since it is reference material
// rather than something you act on.

export interface DetailBudget {
  description: boolean;
  capabilityLines: number;
  installMethod: boolean;
  runHint: boolean;
  website: boolean;
  notes: boolean;
}

/** Rows the pane always spends: the pane title, the entry name, and the installed state. */
const ALWAYS = 3;

/**
 * What fits in a pane `height` rows tall.
 *
 * Allocated most-useful-first rather than by dropping from a full set, so the degradation order is
 * explicit and testable instead of emerging from whichever branch happens to render last.
 */
export function detailBudget(height: number, capabilityCount: number): DetailBudget {
  let left = height - ALWAYS;
  const take = (): boolean => {
    if (left <= 0) return false;
    left -= 1;
    return true;
  };

  const description = take();
  // Capabilities are what let someone compare this entry with alternatives, so they outrank the
  // website and the notes — but they are also the only part that can grow without bound, so they
  // never take more than half of what is left.
  const wanted = capabilityCount === 0 ? 0 : Math.max(1, Math.ceil(capabilityCount / 3));
  const capabilityLines = Math.max(0, Math.min(wanted, Math.floor(Math.max(0, left) / 2)));
  left -= capabilityLines;

  const installMethod = take();
  const runHint = take();
  const website = take();
  const notes = take();

  return { description, capabilityLines, installMethod, runHint, website, notes };
}
