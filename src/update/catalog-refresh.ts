// Catalog refresh — TASKS.md §1.11. Independent of the tool's own version (§ above): the bundled
// catalog can gain new entries between runs without the tool binary itself being updated. This is
// a pure diff over two key-sets, deliberately — it doesn't take a UserConfig or history as a
// parameter at all, which is what actually guarantees "without disturbing existing user selections
// or history": there's nothing in this function's signature capable of touching either.

export interface CatalogRefreshResult {
  /** Present in the newly-loaded catalog but not the previous one. */
  newEntryKeys: string[];
  /** Present in the previous catalog but not the new one (removed or renamed upstream). */
  removedEntryKeys: string[];
}

export function refreshCatalog(
  previousCatalogKeys: ReadonlySet<string>,
  currentCatalogKeys: ReadonlySet<string>,
): CatalogRefreshResult {
  return {
    newEntryKeys: [...currentCatalogKeys].filter((k) => !previousCatalogKeys.has(k)),
    removedEntryKeys: [...previousCatalogKeys].filter((k) => !currentCatalogKeys.has(k)),
  };
}
