// Startup orchestration — the piece that was missing between the engine modules and the app.
//
// Several Phase 1 modules were fully built and tested but reachable from nothing: the system
// requirement pre-flight (§1.4), overlay repo clone/pull/merge (§1.9), and profile validation
// (§1.8). Putting the sequencing here rather than inside App.tsx keeps it unit-testable — the
// component just renders whatever this returns.
//
// Dependencies that touch the network, the filesystem or a subprocess are injected, so tests
// exercise the real sequencing without cloning a repo or calling out to the internet.

import { loadCatalog } from "../catalog/loader.ts";
import { entryKey } from "../catalog/types.ts";
import type { CatalogEntry } from "../catalog/types.ts";
import type { CatalogIssue } from "../catalog/types.ts";
import {
  cloneOverlayRepo,
  type GitRunner,
  pullOverlayRepo,
  realGitRunner,
} from "../overlay/git.ts";
import { scanOverlayCatalog } from "../overlay/scan.ts";
import { mergeCatalogs, mergeProfiles } from "../overlay/merge.ts";
import { loadProfiles } from "../profiles/store.ts";
import { validateProfileAgainstCatalog } from "../profiles/validate.ts";
import type { Profile } from "../profiles/types.ts";
import type { OverlayRepoConfig } from "../config/types.ts";
import {
  checkAvailableDiskSpaceReal,
  checkInternetConnectivityReal,
  type ConnectivityProbe,
  type RequirementCheck,
  runSystemRequirementChecks,
} from "../diagnostics/requirements.ts";
import { detectAvailablePackageManagers } from "../platform/package-managers.ts";
import type { PackageManager } from "../platform/types.ts";
import type { InstallMethod, Platform } from "../catalog/types.ts";
import { refreshCatalog } from "../update/catalog-refresh.ts";
import { join } from "@std/path";

/** Which package manager an install method actually needs present on the machine.
 * Note `appimage` maps to flatpak: this project installs every AppImage through Gear Lever,
 * which is itself a flatpak, so a machine without flatpak cannot run those entries either. */
const METHOD_REQUIRES: Partial<Record<InstallMethod, PackageManager>> = {
  flatpak: "flatpak",
  appimage: "flatpak",
  apt: "apt",
  deb: "apt",
  homebrew: "brew",
  winget: "winget",
};

/** Warns once per missing package manager that the catalog actually needs on this platform —
 * rather than per entry, which would bury the point under dozens of identical lines. */
export function missingPackageManagerWarnings(
  entries: readonly CatalogEntry[],
  platform: Platform,
  available: Record<PackageManager, boolean>,
): string[] {
  const needed = new Map<PackageManager, number>();
  for (const entry of entries) {
    if (entry.platforms[platform] === undefined) continue;
    const method = entry.meta.platforms?.[platform]?.installMethod;
    const manager = method === undefined ? undefined : METHOD_REQUIRES[method];
    if (manager === undefined || available[manager]) continue;
    needed.set(manager, (needed.get(manager) ?? 0) + 1);
  }
  return [...needed.entries()].map(([manager, count]) =>
    `${manager} is not installed, but ${count} catalog entr${
      count === 1 ? "y needs" : "ies need"
    } it`
  );
}

/** Turns a catalog key-set diff into human-readable notices (§1.11). */
export function catalogChangeNotices(
  previousKeys: ReadonlySet<string>,
  currentKeys: ReadonlySet<string>,
): string[] {
  if (previousKeys.size === 0) return []; // first run — everything is "new", which isn't news
  const { newEntryKeys, removedEntryKeys } = refreshCatalog(previousKeys, currentKeys);
  const notices: string[] = [];
  if (newEntryKeys.length > 0) {
    notices.push(
      `${newEntryKeys.length} new catalog entr${
        newEntryKeys.length === 1 ? "y" : "ies"
      } since last run: ${newEntryKeys.slice(0, 5).join(", ")}${
        newEntryKeys.length > 5 ? "…" : ""
      }`,
    );
  }
  if (removedEntryKeys.length > 0) {
    notices.push(
      `${removedEntryKeys.length} catalog entr${
        removedEntryKeys.length === 1 ? "y" : "ies"
      } removed since last run: ${removedEntryKeys.slice(0, 5).join(", ")}${
        removedEntryKeys.length > 5 ? "…" : ""
      }`,
    );
  }
  return notices;
}

/** A stable, filesystem-safe directory name for a repo URL. Deliberately derived from the URL
 * rather than the repo's own name so two repos that happen to share a name can't collide. */
export function overlayDirName(url: string): string {
  const safe = url.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = (hash * 31 + url.charCodeAt(i)) | 0;
  return `${safe}-${(hash >>> 0).toString(16)}`;
}

export interface OverlaySyncResult {
  /** Local checkout directories, in the same order the repos were configured. */
  dirs: string[];
  /** One per repo that could not be cloned or pulled. Never throws: a broken overlay must not
   * stop the tool from starting with its bundled catalog. */
  errors: string[];
}

export interface SyncOverlaysDeps {
  git?: GitRunner;
  /** Injected so tests don't need a real filesystem probe. */
  exists?: (path: string) => Promise<boolean>;
}

async function defaultExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Clones each configured overlay repo, or pulls it if already present. */
export async function syncOverlayRepos(
  repos: readonly OverlayRepoConfig[],
  overlaysDir: string,
  deps: SyncOverlaysDeps = {},
): Promise<OverlaySyncResult> {
  const git = deps.git ?? realGitRunner;
  const exists = deps.exists ?? defaultExists;

  const dirs: string[] = [];
  const errors: string[] = [];

  for (const repo of repos) {
    const dir = join(overlaysDir, overlayDirName(repo.url));
    const alreadyCloned = await exists(dir);
    const result = alreadyCloned
      ? await pullOverlayRepo(dir, repo.ref, git)
      : await cloneOverlayRepo(repo.url, dir, repo.ref, git);

    if (result.ok) {
      dirs.push(dir);
    } else {
      // Keep going: one unreachable overlay shouldn't prevent the others, or the bundled
      // catalog, from loading.
      errors.push(result.error);
      if (alreadyCloned) dirs.push(dir); // a failed pull still leaves a usable older checkout
    }
  }

  return { dirs, errors };
}

export interface BootstrapResult {
  entries: CatalogEntry[];
  profiles: Profile[];
  /** Every key in the merged catalog — the caller persists this so the next run can report what
   * changed (§1.11). */
  catalogKeys: string[];
  /** Non-fatal problems worth showing the user: catalog issues, overlay failures, profiles that
   * reference entries which don't exist. */
  warnings: string[];
  /**
   * True when every configured source loaded. Only then is a selected key that is missing from the
   * catalog *known* to be gone rather than temporarily unreachable — an overlay repo that failed to
   * clone takes its entries with it, and pruning the selection on that basis would silently discard
   * the user's choices for software that still exists.
   */
  catalogComplete: boolean;
}

export interface BootstrapDeps {
  catalogRoot: string;
  profilesRoot: string;
  overlayRepos?: readonly OverlayRepoConfig[];
  overlaysDir?: string;
  git?: GitRunner;
  exists?: (path: string) => Promise<boolean>;
  /** When given, missing-package-manager and catalog-change notices are included. */
  platform?: Platform;
  packageManagers?: Record<PackageManager, boolean>;
  previousCatalogKeys?: ReadonlySet<string>;
}

function describe(issues: readonly CatalogIssue[]): string[] {
  return issues.map((i) => `${i.path}: ${i.message}`);
}

/**
 * Loads the bundled catalog and profiles, layers any configured overlay repos on top, and
 * validates the result. Overlays are applied in configured order (later repos win), matching
 * mergeCatalogs' documented precedence.
 */
export async function bootstrapCatalog(deps: BootstrapDeps): Promise<BootstrapResult> {
  const warnings: string[] = [];
  let catalogComplete = true;

  const core = await loadCatalog(deps.catalogRoot);
  warnings.push(...describe(core.errors));

  const coreProfiles = await loadProfiles(deps.profilesRoot);
  warnings.push(...coreProfiles.errors.map((e) => `${e.path}: ${e.message}`));

  let entries = core.entries;
  let profiles = coreProfiles.profiles;

  const repos = deps.overlayRepos ?? [];
  if (repos.length > 0 && deps.overlaysDir !== undefined) {
    const sync = await syncOverlayRepos(repos, deps.overlaysDir, {
      git: deps.git,
      exists: deps.exists,
    });
    warnings.push(...sync.errors);
    if (sync.errors.length > 0) catalogComplete = false;

    const overlayEntrySets = [];
    const overlayProfileSets = [];
    for (const dir of sync.dirs) {
      const scanned = await scanOverlayCatalog(join(dir, "catalog"));
      warnings.push(...describe(scanned.errors));
      if (scanned.errors.length > 0) catalogComplete = false;
      overlayEntrySets.push(scanned.entries);

      const overlayProfiles = await loadProfiles(join(dir, "profiles"));
      warnings.push(...overlayProfiles.errors.map((e) => `${e.path}: ${e.message}`));
      overlayProfileSets.push(overlayProfiles.profiles);
    }

    const merged = mergeCatalogs(entries, overlayEntrySets);
    warnings.push(...describe(merged.errors));
    entries = merged.entries;
    profiles = mergeProfiles(profiles, overlayProfileSets);
  }

  // Validate profiles against the *merged* catalog, so an overlay profile referencing an overlay
  // entry validates correctly. Without this, a profile with a stale key stayed silent until the
  // user picked it and got a plan that quietly did less than they asked for.
  const known = new Set(entries.map(entryKey));
  for (const profile of profiles) {
    for (const issue of validateProfileAgainstCatalog(profile, known)) {
      // ProfileIssue is {path, message} — interpolating the object directly rendered
      // "[object Object]" and hid the entry name the user needs to fix it.
      warnings.push(`${issue.path}: ${issue.message}`);
    }
  }

  if (deps.platform !== undefined) {
    const available = deps.packageManagers ?? await detectAvailablePackageManagers();
    warnings.push(...missingPackageManagerWarnings(entries, deps.platform, available));
  }
  if (deps.previousCatalogKeys !== undefined) {
    warnings.push(...catalogChangeNotices(deps.previousCatalogKeys, known));
  }

  return { entries, profiles, catalogKeys: [...known], warnings, catalogComplete };
}

/** Runs the §1.4 pre-flight against the real machine. Never throws — a failed probe is reported
 * as a failed check, not an exception that stops the app from starting. */
export async function runPreflight(): Promise<RequirementCheck[]> {
  let internetReachable: ConnectivityProbe = { reachable: false };
  let availableDiskGB = 0;
  try {
    internetReachable = await checkInternetConnectivityReal();
  } catch (err) {
    // The probe already classifies its own failures; anything reaching here is unexpected, so it
    // is reported as itself rather than flattened into "no internet".
    internetReachable = {
      reachable: false,
      reason: `connectivity check failed — ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  try {
    availableDiskGB = await checkAvailableDiskSpaceReal();
  } catch {
    availableDiskGB = 0;
  }
  return runSystemRequirementChecks({ internetReachable, availableDiskGB });
}
