// Overlay merge — TASKS.md §1.9. Two different merge rules for two different things:
//
// Catalog entries merge **per platform folder, not per file** (confirmed — an earlier per-file
// design was rejected as unsafe): if an overlay provides *any* operation script for a given
// platform, it replaces *all* of that entry's operations for that platform — none of the core's
// scripts for that platform carry over. The risk this avoids: if the core catalog later changes
// how an entry works on some platform (e.g. Steam's Linux install moves from a .deb to a flatpak),
// an overlay that only overrode `install.sh` under the old per-file rule would silently end up with
// a mismatched hybrid — its own stale install script paired with the core's new detect/remove
// scripts built for a completely different install method. With whole-platform-folder replacement,
// an overlay overriding a platform is fully responsible for that platform's entire operation set;
// the existing catalog validator (validateCatalog) already catches an incomplete override (missing
// detect.sh, or nothing besides it) with no extra logic needed here, since the merged result is
// validated the same way any catalog is. Other platforms the overlay doesn't touch, and `meta` when
// the overlay doesn't supply its own meta.toml, still inherit from the core entry independently —
// this all-or-nothing rule applies per platform, not to the whole entry at once.
//
// Profiles merge **whole-file, by filename** — a profile is one cohesive bundle, so an overlay
// profile sharing a built-in one's filename replaces it entirely rather than merging entry lists
// (partial-merging two authors' idea of "Developer" would just be confusing — same reasoning as
// above, applied to a different unit).
//
// Multiple configured overlay repos are applied in the user's configured order — later overlays
// win over earlier ones, which themselves win over the core.

import type { CatalogEntry, CatalogIssue, Kind } from "../catalog/types.ts";
import type { OverlayEntry } from "./scan.ts";
import type { Profile } from "../profiles/types.ts";

function key(e: { category: string; kind: Kind; id: string }): string {
  return `${e.category}/${e.kind}/${e.id}`;
}

export interface MergeCatalogResult {
  entries: CatalogEntry[];
  errors: CatalogIssue[];
}

export function mergeCatalogs(
  core: readonly CatalogEntry[],
  overlaysInOrder: readonly (readonly OverlayEntry[])[],
): MergeCatalogResult {
  const byKey = new Map<string, CatalogEntry>();
  for (const entry of core) byKey.set(key(entry), entry);

  const errors: CatalogIssue[] = [];

  for (const overlayEntries of overlaysInOrder) {
    for (const overlayEntry of overlayEntries) {
      const k = key(overlayEntry);
      const existing = byKey.get(k);

      if (existing === undefined) {
        if (overlayEntry.meta === undefined) {
          errors.push({
            path: k,
            message:
              `new overlay entry "${k}" has no meta.toml to inherit from (there is no core entry with this id)`,
          });
          continue;
        }
        if (Object.keys(overlayEntry.platforms).length === 0) {
          errors.push({
            path: k,
            message: `new overlay entry "${k}" has no platform scripts at all`,
          });
          continue;
        }
        byKey.set(k, {
          category: overlayEntry.category,
          kind: overlayEntry.kind,
          id: overlayEntry.id,
          meta: overlayEntry.meta,
          path: k,
          platforms: overlayEntry.platforms as CatalogEntry["platforms"],
        });
        continue;
      }

      // Whole-platform-folder replacement: a platform the overlay provides replaces the core's
      // entire operation set for that platform (not merged key-by-key) — see the header comment
      // for why partial per-file inheritance is unsafe. A platform the overlay doesn't mention at
      // all is untouched, still fully inherited from the core entry.
      const mergedPlatforms: CatalogEntry["platforms"] = { ...existing.platforms };
      for (const [platform, ops] of Object.entries(overlayEntry.platforms)) {
        const platformKey = platform as keyof CatalogEntry["platforms"];
        mergedPlatforms[platformKey] = ops;
      }

      byKey.set(k, {
        ...existing,
        meta: overlayEntry.meta ?? existing.meta,
        platforms: mergedPlatforms,
      });
    }
  }

  return { entries: [...byKey.values()], errors };
}

export function mergeProfiles(
  core: readonly Profile[],
  overlaysInOrder: readonly (readonly Profile[])[],
): Profile[] {
  const byId = new Map(core.map((p) => [p.id, p]));
  for (const overlayProfiles of overlaysInOrder) {
    for (const profile of overlayProfiles) byId.set(profile.id, profile);
  }
  return [...byId.values()];
}
