import type { CatalogEntry, CatalogIssue } from "./types.ts";

/**
 * Validates a set of already-loaded catalog entries (works equally on a single catalog root's
 * entries or a merged core+overlay set, since duplicate-id detection only matters once entries
 * from more than one source can collide — see TASKS.md §1.9).
 *
 * The loader (loader.ts) already guarantees each individual entry has a valid kind and at least
 * one platform folder — this validator checks things that only make sense across the whole set,
 * or within a single entry's platform folders, which the loader doesn't enforce by construction.
 */
export function validateCatalog(entries: CatalogEntry[]): CatalogIssue[] {
  const issues: CatalogIssue[] = [];

  const seen = new Map<string, string>(); // "category/kind/id" -> first path seen
  for (const entry of entries) {
    const key = entry.id;
    const existingPath = seen.get(key);
    if (existingPath !== undefined) {
      issues.push({
        path: entry.path,
        message: `duplicate entry "${key}" (already defined at ${existingPath})`,
      });
      continue;
    }
    seen.set(key, entry.path);

    for (const [platform, ops] of Object.entries(entry.platforms)) {
      const opNames = Object.keys(ops);
      if (!("detect" in ops)) {
        issues.push({
          path: `${entry.path}/${platform}`,
          message:
            `platform folder "${platform}" is missing detect.sh (required for every platform folder)`,
        });
      }
      if (opNames.length < 2) {
        issues.push({
          path: `${entry.path}/${platform}`,
          message:
            `platform folder "${platform}" has no operation besides detect.sh — needs at least one of install/remove/update`,
        });
      }
    }
  }

  return issues;
}
