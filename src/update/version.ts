// Self-update version check — TASKS.md §1.11. A minimal semver comparator (major.minor.patch only,
// no pre-release/build-metadata handling — not needed for "is there a newer release than mine")
// plus a real wrapper that checks GitHub's releases API, with the repo and fetch both injectable.

export type VersionStatus = "update-available" | "up-to-date" | "ahead-of-latest";

interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

function parseSemVer(version: string): SemVer {
  const cleaned = version.trim().replace(/^v/i, "");
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(cleaned);
  if (!match) {
    throw new Error(
      `"${version}" is not a valid version string (expected e.g. "1.2.3" or "v1.2.3")`,
    );
  }
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

/**
 * "ahead-of-latest" covers a local dev build (e.g. built from an unreleased commit with a bumped
 * version) — distinct from "up-to-date" so the caller can render it differently ("running a
 * development build" vs "you're up to date"), rather than treating both as "nothing to do."
 */
export function compareVersions(currentVersion: string, latestVersion: string): VersionStatus {
  const current = parseSemVer(currentVersion);
  const latest = parseSemVer(latestVersion);

  if (current.major !== latest.major) {
    return current.major < latest.major ? "update-available" : "ahead-of-latest";
  }
  if (current.minor !== latest.minor) {
    return current.minor < latest.minor ? "update-available" : "ahead-of-latest";
  }
  if (current.patch !== latest.patch) {
    return current.patch < latest.patch ? "update-available" : "ahead-of-latest";
  }
  return "up-to-date";
}

export type UpdateCheckResult =
  | { ok: true; status: VersionStatus; latestVersion: string }
  | { ok: false; error: string };

/** Real wrapper: checks GitHub's releases API. `repo` (e.g. "owner/name") and `fetchImpl` are both
 * injectable — this project's own repo name isn't settled yet, and tests never hit the network. */
export async function checkForUpdate(
  currentVersion: string,
  repo: string,
  fetchImpl: typeof fetch = fetch,
): Promise<UpdateCheckResult> {
  let response: Response;
  try {
    response = await fetchImpl(`https://api.github.com/repos/${repo}/releases/latest`);
  } catch (err) {
    return { ok: false, error: `could not check for updates (${(err as Error).message})` };
  }

  if (!response.ok) {
    return { ok: false, error: `update check failed: HTTP ${response.status}` };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    return {
      ok: false,
      error: `update check response was not valid JSON (${(err as Error).message})`,
    };
  }

  const latestVersion = (data as Record<string, unknown> | null)?.tag_name;
  if (typeof latestVersion !== "string") {
    return { ok: false, error: `update check response did not include a "tag_name"` };
  }

  try {
    return { ok: true, status: compareVersions(currentVersion, latestVersion), latestVersion };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
