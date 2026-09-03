// "What's changed since last run" — TASKS.md §1.7, PROJECT_DEFINITION.md §5 ("can highlight what's
// new or changed since the last run"). A plain selection diff, plus one thing that specifically
// needs the catalog: distinguishing "you deselected this" from "this entry doesn't exist anymore"
// (removed/renamed upstream) — those are different situations worth surfacing differently.

export interface SelectionDiff {
  /** Selected now, wasn't selected last run. */
  added: string[];
  /** Was selected last run, isn't selected now (but still exists in the catalog). */
  removed: string[];
  /** Selected both last run and now. */
  unchanged: string[];
  /** Was selected last run, but no longer exists in the current catalog at all — distinct from
   * `removed`, since this means the entry disappeared upstream, not that the user changed their mind. */
  noLongerInCatalog: string[];
}

export function diffSelections(
  previousSelectedKeys: ReadonlySet<string>,
  currentSelectedKeys: ReadonlySet<string>,
  currentCatalogKeys: ReadonlySet<string>,
): SelectionDiff {
  return {
    added: [...currentSelectedKeys].filter((k) => !previousSelectedKeys.has(k)),
    removed: [...previousSelectedKeys].filter(
      (k) => !currentSelectedKeys.has(k) && currentCatalogKeys.has(k),
    ),
    unchanged: [...currentSelectedKeys].filter((k) => previousSelectedKeys.has(k)),
    noLongerInCatalog: [...previousSelectedKeys].filter((k) => !currentCatalogKeys.has(k)),
  };
}
