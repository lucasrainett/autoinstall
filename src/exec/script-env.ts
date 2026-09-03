// The contract between the engine's configuration and the shell scripts it runs.
//
// Catalog scripts are standalone bash files (PROJECT_DEFINITION.md §2) — they cannot import the
// engine's config, so anything they need has to arrive as environment. That matters for the
// de-personalisation requirement (§17): entries like "git identity" or "dotfiles" must apply the
// *user's* name and email without any of it being hardcoded in the catalog, which means the
// engine has to hand it over at run time.
//
// Every variable is prefixed `AUTOINSTALL_` so a script can tell what came from this tool, and
// nothing is exported unless it is actually configured — a script can then distinguish "not
// configured" from "configured as empty" and refuse rather than write a blank git identity.

import type { UserConfig } from "../config/types.ts";

/** Names deliberately kept stable: catalog scripts (including ones in a user's personal overlay
 * repo) depend on them, so renaming these is a breaking change to every overlay. */
export const IDENTITY_NAME_VAR = "AUTOINSTALL_IDENTITY_NAME";
export const IDENTITY_EMAIL_VAR = "AUTOINSTALL_IDENTITY_EMAIL";

export function buildScriptEnv(config: Pick<UserConfig, "identity">): Record<string, string> {
  const env: Record<string, string> = {};
  const name = config.identity?.name?.trim();
  const email = config.identity?.email?.trim();
  // Whitespace-only is treated as absent: a script that checks `-n "$AUTOINSTALL_IDENTITY_NAME"`
  // would otherwise happily configure git with a name of " ".
  if (name !== undefined && name.length > 0) env[IDENTITY_NAME_VAR] = name;
  if (email !== undefined && email.length > 0) env[IDENTITY_EMAIL_VAR] = email;
  return env;
}
