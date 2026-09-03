// Overlay catalog scanner — TASKS.md §1.9. Walks an overlay repo's `catalog/` tree the same shape
// as the core loader (src/catalog/loader.ts), but tolerantly: unlike a core entry, an overlay
// entry doesn't need its own meta.toml (a pure script override inherits the core entry's meta) and
// doesn't need to provide every operation (per-file override, §1.9's assumed granularity — see
// merge.ts) or even any platform at all. What it does provide is validated the same way the core
// loader validates it, via the same exported functions — an overlay's meta.toml, if present, must
// follow the exact same rules as a core one.

import {
  isDirectory,
  listDirNames,
  loadPlatformOperations,
  META_FILENAME,
  parseEntryMeta,
} from "../catalog/loader.ts";
import {
  type CatalogIssue,
  type EntryMeta,
  isKind,
  isPlatform,
  type Kind,
  KINDS,
  type Platform,
  type PlatformOperations,
  PLATFORMS,
} from "../catalog/types.ts";

export interface OverlayEntry {
  category: string;
  kind: Kind;
  id: string;
  /** Present only if this overlay provides its own meta.toml for this entry. */
  meta?: EntryMeta;
  platforms: Partial<Record<Platform, PlatformOperations>>;
}

export interface OverlayScanResult {
  entries: OverlayEntry[];
  errors: CatalogIssue[];
}

export async function scanOverlayCatalog(catalogRoot: string): Promise<OverlayScanResult> {
  const entries: OverlayEntry[] = [];
  const errors: CatalogIssue[] = [];

  if (!(await isDirectory(catalogRoot))) {
    // An overlay repo with no catalog/ directory at all is valid (it might only add profiles or
    // identity), not an error — unlike the core catalog, which must exist.
    return { entries, errors };
  }

  for (const category of await listDirNames(catalogRoot)) {
    const categoryPath = `${catalogRoot}/${category}`;

    for (const kindName of await listDirNames(categoryPath)) {
      const kindPath = `${categoryPath}/${kindName}`;

      if (!isKind(kindName)) {
        errors.push({
          path: kindPath,
          message: `"${kindName}" is not a valid kind (expected one of: ${KINDS.join(", ")})`,
        });
        continue;
      }
      const kind = kindName;

      for (const id of await listDirNames(kindPath)) {
        const entryPath = `${kindPath}/${id}`;
        const metaPath = `${entryPath}/${META_FILENAME}`;

        // entryPath is always a directory here — it came from listDirNames(kindPath), which only
        // returns directory entries.
        let meta: EntryMeta | undefined;
        try {
          const raw = await Deno.readTextFile(metaPath);
          meta = parseEntryMeta(raw, metaPath, kind);
        } catch (err) {
          if (err instanceof Deno.errors.NotFound) {
            meta = undefined; // no meta.toml override — inherit the core entry's, if any
          } else {
            errors.push({ path: metaPath, message: (err as Error).message });
            continue;
          }
        }

        const platforms: OverlayEntry["platforms"] = {};
        for (const platformName of await listDirNames(entryPath)) {
          if (!isPlatform(platformName)) {
            errors.push({
              path: `${entryPath}/${platformName}`,
              message: `"${platformName}" is not a valid platform (expected one of: ${
                PLATFORMS.join(", ")
              })`,
            });
            continue;
          }
          platforms[platformName] = await loadPlatformOperations(`${entryPath}/${platformName}`);
        }

        entries.push({ category, kind, id, ...(meta !== undefined ? { meta } : {}), platforms });
      }
    }
  }

  return { entries, errors };
}
