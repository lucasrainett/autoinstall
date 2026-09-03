// Which catalog entries apply to the machine in front of you.
//
// A platform folder's absence is how the catalog says "this software does not exist here"
// (PROJECT_DEFINITION.md §4). The planner already honoured that, but the list did not: on Linux it
// showed all 86 entries including GarageBand, Keynote, the Xbox app and eight others that can
// never be installed, each stuck on the "not checked" glyph because no detect script had run for
// them. Reported by the user — "Numbers is a mac only software, should not be visible in linux".
//
// Cross-platform equivalents need no special handling: an entry that maps to different software
// per platform (StreamController on Linux, Elgato's client elsewhere) simply has a folder for each
// one, so it stays visible everywhere it means something.

import type { CatalogEntry, Platform } from "./types.ts";

/** True when this entry has something runnable on the given platform. */
export function appliesTo(entry: CatalogEntry, platform: Platform): boolean {
  return entry.platforms[platform] !== undefined;
}

/** The entries worth showing on this platform, in their original order. */
export function entriesForPlatform(
  entries: readonly CatalogEntry[],
  platform: Platform | undefined,
): CatalogEntry[] {
  // Before the platform is known (the first paint of a run) nothing is filtered out, so the list
  // never briefly hides entries and then adds them back.
  if (platform === undefined) return [...entries];
  return entries.filter((entry) => appliesTo(entry, platform));
}
