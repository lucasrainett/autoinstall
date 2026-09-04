// The version this build reports.
//
// Rewritten by .github/workflows/release.yml from the git tag immediately before `deno compile`,
// because a compiled binary has no repository to ask. The default below is what a build from a
// working copy reports, and it is deliberately not a plausible release number: a binary claiming
// "0.1.0" when it was built from an arbitrary commit makes the update check lie, and every user
// of every later release would have been told they were out of date forever.
export const TOOL_VERSION = "0.0.0-dev";

/** True when this build did not come from a tagged release, so version comparisons are meaningless. */
export function isDevelopmentBuild(version: string = TOOL_VERSION): boolean {
  return version.endsWith("-dev");
}

/**
 * The repository this build checks for updates and downloads releases from.
 *
 * Held here rather than at each use site because three places need to agree — the update check,
 * `scripts/bootstrap.sh` and `scripts/bootstrap.ps1` — and a release where they disagree fails in
 * a way nobody notices until a user cannot download an upgrade.
 *
 * Overridable by environment so a fork is usable without editing source: a fork that publishes its
 * own releases sets AUTOINSTALL_UPDATE_REPO and everything follows.
 */
export const DEFAULT_UPDATE_REPO = "lucasrainett/autoinstall";

export function updateRepo(env: { get(k: string): string | undefined } = Deno.env): string {
  const configured = env.get("AUTOINSTALL_UPDATE_REPO");
  return configured !== undefined && configured.length > 0 ? configured : DEFAULT_UPDATE_REPO;
}
