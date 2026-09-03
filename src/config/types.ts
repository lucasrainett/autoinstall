// User config schema — TASKS.md §1.7. TOML, per the file-format rule: this is machine-local
// configuration, not an entry/script. Identity here is a fallback/default for a user who hasn't
// set up a personal overlay repo (§1.9) — when one is configured, its identity.toml is the
// portable, canonical source; this local copy is what covers standalone use without one.

export interface Identity {
  name?: string;
  email?: string;
}

export interface OverlayRepoConfig {
  url: string;
  /** Branch/tag/commit to pin to. Omitted means "track the repo's default branch". */
  ref?: string;
}

export interface UserConfig {
  identity?: Identity;
  /** Remembered selections from the last run — "category/kind/id" keys (§1.4's reconciliation
   * compares these against live diagnosed state). */
  selectedKeys: string[];
  /** Which meaning `selectedKeys` was written with. Absent in any config saved before the
   * desired-state model, which is exactly what `config/migrate.ts` keys the migration off — an
   * unmarked selection is a list of wanted installs, not an exhaustive desired state. */
  selectionModel?: string;
  overlayRepos: OverlayRepoConfig[];
}

export function defaultUserConfig(): UserConfig {
  return { selectedKeys: [], overlayRepos: [] };
}
