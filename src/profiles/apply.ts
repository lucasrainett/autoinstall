import type { Profile } from "./types.ts";

/**
 * Additive-only, per PROJECT_DEFINITION.md §2: applying a profile only turns things on — it never
 * deselects anything already selected from a different source. Applying multiple (even
 * overlapping) profiles is safe by construction: Set union can't duplicate or throw.
 */
export function applyProfile(currentSelection: ReadonlySet<string>, profile: Profile): Set<string> {
  return new Set([...currentSelection, ...profile.entryKeys]);
}
