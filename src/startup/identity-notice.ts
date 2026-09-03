// Warns when entries need an identity the config does not have.
//
// Some entries apply the *user's* name and email — a git identity, an SSH key comment — and
// receive them as environment (see exec/script-env.ts) rather than hardcoding personal details in
// the catalog. With no identity configured those entries are permanently unsatisfiable: their
// detect script exits 1 because it has nothing to compare against, so the entry sits unchecked
// forever, and checking it produces an install that cannot succeed.
//
// Nothing said so. The entry simply looked like software that would not install. This turns a
// silent dead end into one sentence naming the file to edit.

import { entryKey } from "../catalog/types.ts";
import type { CatalogEntry, Platform } from "../catalog/types.ts";
import type { Identity } from "../config/types.ts";

/** The environment variables `exec/script-env.ts` exports; a script mentioning either needs them. */
const IDENTITY_VARS = ["AUTOINSTALL_IDENTITY_NAME", "AUTOINSTALL_IDENTITY_EMAIL"];

export function identityIsConfigured(identity: Identity | undefined): boolean {
  return (identity?.name ?? "").trim().length > 0 &&
    (identity?.email ?? "").trim().length > 0;
}

/**
 * Entry keys whose scripts for this platform read the identity variables.
 *
 * `readFile` is injected so this is testable without a catalog on disk, and because it is only
 * ever called when the identity is missing — there is no point scanning otherwise.
 */
export async function entriesNeedingIdentity(
  entries: readonly CatalogEntry[],
  platform: Platform,
  readFile: (path: string) => Promise<string>,
): Promise<string[]> {
  const needing: string[] = [];
  for (const entry of entries) {
    const ops = entry.platforms[platform];
    if (ops === undefined) continue;
    let uses = false;
    for (const script of [ops.detect, ops.install, ops.remove, ops.update]) {
      if (script === undefined || uses) continue;
      try {
        const source = await readFile(script);
        uses = IDENTITY_VARS.some((v) => source.includes(v));
      } catch {
        // An unreadable script is reported elsewhere; it is not this check's business.
      }
    }
    if (uses) needing.push(entryKey(entry));
  }
  return needing;
}

/** The notice itself, or undefined when there is nothing to say. */
export function identityNotice(configPath: string, needing: readonly string[]): string | undefined {
  if (needing.length === 0) return undefined;
  const names = needing.join(", ");
  return `No identity is set, so ${needing.length} entr${
    needing.length === 1 ? "y" : "ies"
  } can never be satisfied (${names}). Add your name and email under [identity] in ${configPath}.`;
}
