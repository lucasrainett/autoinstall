import type { Profile } from "./types.ts";
import type { ProfileIssue } from "./store.ts";

/**
 * Every key a profile references must exist in the loaded catalog (which, by construction of the
 * catalog loader/validator, means it already has at least one platform) — a profile referencing a
 * nonexistent id is flagged here, not silently dropped.
 */
export function validateProfileAgainstCatalog(
  profile: Profile,
  catalogKeys: ReadonlySet<string>,
): ProfileIssue[] {
  const issues: ProfileIssue[] = [];
  for (const key of profile.entryKeys) {
    if (!catalogKeys.has(key)) {
      issues.push({
        path: `profiles/${profile.id}.toml`,
        message: `references unknown catalog entry "${key}"`,
      });
    }
  }
  return issues;
}
