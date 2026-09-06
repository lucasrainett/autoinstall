// Catalog schema — see TASKS.md §1.1 and PROJECT_DEFINITION.md §2.
//
// On-disk shape: catalog/[id]/[platform]/[operation].sh, plus catalog/[id]/meta.toml.
//
// Flat, one directory per entry, because the id is the whole key. The old
// catalog/[category]/[kind]/[id] layout encoded an entry's category into its key, so moving an
// entry between categories orphaned every saved selection and profile that referred to it.

import type { Capability } from "./capabilities.ts";
export const KINDS = ["install", "configure", "cleanup"] as const;
export type Kind = (typeof KINDS)[number];

export function isKind(value: string): value is Kind {
  return (KINDS as readonly string[]).includes(value);
}

export const PLATFORMS = ["linux", "macos", "windows"] as const;
export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

// "run" is deliberately last and deliberately optional: it is the only operation that does not
// change the machine. It exists because the tool already knows what it installed and where, which
// makes it the shortest path from "I just installed this" to actually using it. An entry without a
// run.sh simply cannot be started from here — the honest answer for a command-line utility.
export const OPERATIONS = ["detect", "install", "remove", "update", "run"] as const;
export type Operation = (typeof OPERATIONS)[number];

export const INSTALL_METHODS = [
  "flatpak",
  "apt",
  "deb",
  "homebrew",
  "winget",
  "appimage",
  "script",
  "direct-download",
] as const;
export type InstallMethod = (typeof INSTALL_METHODS)[number];

export function isInstallMethod(value: string): value is InstallMethod {
  return (INSTALL_METHODS as readonly string[]).includes(value);
}

/**
 * Parsed, validated contents of an entry's meta.toml. Strict: no fields beyond these are allowed.
 * `website` is required for `install`-kind entries (the app's homepage) and optional otherwise —
 * a `configure`/`cleanup` entry like "disable telemetry" doesn't really have one. `destructive`
 * defaults to false and is optional to set — most entries don't need it, so requiring it
 * explicitly on every entry would be pure boilerplate.
 */
export interface EntryMeta {
  name: string;
  description: string;
  kind: Kind;
  website?: string;
  /** What this entry lets you *do*, from the closed vocabulary in capabilities.ts. Independent of
   * which program provides it, so the same capability can be compared across platforms — see that
   * file's header for the errors this exists to prevent. */
  capabilities?: readonly Capability[];
  /** Hard-to-reverse or high-impact (disk encryption, major removals, registry-level changes) —
   * flagged distinctly in the rendered plan per PROJECT_DEFINITION.md §14. Defaults to false. */
  destructive?: boolean;
  /** Per-platform metadata — written in meta.toml as top-level `[linux]`/`[macos]`/`[windows]`
   * tables, e.g. Proton Mail's `[linux]` has `notes = "..."` and `requiresElevation = true` while
   * its `[macos]`/`[windows]` only have `notes`. Grouped together (not two parallel structures)
   * since both describe the same platform's own install behavior. Absent for a platform, or
   * absent entirely, means "nothing to say, no elevation needed" for that platform. */
  platforms?: Partial<Record<Platform, PlatformMeta>>;
}

export interface PlatformMeta {
  /** How this entry actually gets installed on this platform — a closed, structured tag rather
   * than prose, so it's consistent and could later drive filtering/badges in the UI. */
  installMethod?: InstallMethod;
  /** Anything beyond the plain install `installMethod` already implies — extra config changes,
   * multi-step detail, why elevation is needed, etc. Not a restatement of the install method
   * itself. Shown only when the user is actually on this platform (see App.tsx's detail pane) —
   * the other platforms' notes aren't relevant to them. */
  notes?: string;
  /** Whether this entry's install/remove/update operations need elevated access on this platform
   * specifically (§15). Defaults to false. Several real entries (Proton Mail/Pass/VPN) only need
   * elevation on Linux (apt) — a single entry-wide flag would trigger an unnecessary elevation
   * prompt on the platforms that don't need it. */
  requiresElevation?: boolean;
}

/** Which operation scripts exist for one platform folder of one entry. */
export type PlatformOperations = Partial<Record<Operation, string>>; // operation -> absolute script path

/** One fully-loaded catalog entry: its id plus metadata and per-platform scripts. */
export interface CatalogEntry {
  /** Every category this entry belongs to, derived from its capabilities — never declared. An
   * entry doing several unrelated things (Steam: a store, a chat client and a screen recorder)
   * belongs to each of their categories. */
  categories: readonly string[];
  kind: Kind;
  id: string;
  meta: EntryMeta;
  /** Absolute path to this entry's own directory (catalog/[id]). */
  path: string;
  /** Present only for platforms that have a folder for this entry — an absent platform means "not applicable" (PROJECT_DEFINITION.md §4). */
  platforms: Partial<Record<Platform, PlatformOperations>>;
}

/** A single problem found while loading or validating the catalog, tied to the path that caused it. */
export interface CatalogIssue {
  path: string;
  message: string;
}

export interface CatalogLoadResult {
  entries: CatalogEntry[];
  errors: CatalogIssue[];
}

/** The canonical key: an entry's id, used everywhere an entry needs to be looked up by
 * identity (diagnostic snapshots, plans, history, selections, overlay merge). */
export function entryKey(entry: CatalogEntry): string {
  return entry.id;
}
