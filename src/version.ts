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
