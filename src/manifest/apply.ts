import type { OverlayRepoConfig } from "../config/types.ts";
import type { Manifest } from "./types.ts";

export interface ManifestImportResult {
  /** Only keys that exist in the current catalog — the point of the exercise (reproducing a
   * setup) can't select something that isn't there anymore. */
  selectedKeys: string[];
  overlayRepos: OverlayRepoConfig[];
  /** One entry per manifest key that no longer exists in the current catalog — surfaced, not
   * silently dropped, since a manifest imported on a different machine or after a catalog update
   * may reference something renamed or removed upstream. */
  warnings: string[];
}

export function importManifest(
  manifest: Manifest,
  currentCatalogKeys: ReadonlySet<string>,
): ManifestImportResult {
  const selectedKeys: string[] = [];
  const warnings: string[] = [];

  for (const key of manifest.selectedKeys) {
    if (currentCatalogKeys.has(key)) {
      selectedKeys.push(key);
    } else {
      warnings.push(`"${key}" is in the manifest but no longer exists in the catalog — skipped`);
    }
  }

  return { selectedKeys, overlayRepos: manifest.overlayRepos, warnings };
}
