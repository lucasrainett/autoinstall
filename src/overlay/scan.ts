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
  isPlatform,
  type Platform,
  type PlatformOperations,
  PLATFORMS,
} from "../catalog/types.ts";

export interface OverlayEntry {
  id: string;
  /** Only known when the overlay ships its own meta.toml; otherwise inherited from the core
   * entry at merge time, along with category and kind. */
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

  for (const id of await listDirNames(catalogRoot)) {
    const entryPath = `${catalogRoot}/${id}`;
    const metaPath = `${entryPath}/${META_FILENAME}`;

    // entryPath is always a directory here — it came from listDirNames, which only returns
    // directory entries.
    let meta: EntryMeta | undefined;
    try {
      const raw = await Deno.readTextFile(metaPath);
      meta = parseEntryMeta(raw, metaPath);
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

    entries.push({ id, ...(meta !== undefined ? { meta } : {}), platforms });
  }

  return { entries, errors };
}
