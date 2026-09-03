// Manifest schema — TASKS.md §1.10, PROJECT_DEFINITION.md §16 ("export current selections as a
// single shareable file"). Deliberately excludes identity: a manifest may be shared with someone
// else, not just moved to your own new machine, so embedding your name/email by default would be
// a quiet privacy leak. Just the portable part — the same two fields §1.7's UserConfig already has.

import type { OverlayRepoConfig } from "../config/types.ts";

export interface Manifest {
  selectedKeys: string[];
  overlayRepos: OverlayRepoConfig[];
}
