import { parse as parseToml, stringify as stringifyToml } from "@std/toml";
import { dirname } from "@std/path";
import { z } from "zod";
import { parseTomlOrThrow, parseWith, strictTable } from "../schema/parse.ts";
import { defaultUserConfig, type OverlayRepoConfig, type UserConfig } from "./types.ts";

const IdentitySchema = strictTable({
  name: z.string().optional(),
  email: z.string().optional(),
});

/** Exported so the manifest module reuses exactly these rules rather than restating them — a
 * manifest's overlayRepos field is the same shape as the user config's. */
export const OverlayRepoSchema = strictTable({
  url: z.string().min(1, "is required and must be a non-empty string"),
  /** Branch/tag/commit to pin to; omitted means "track the default branch". */
  ref: z.string().optional(),
});

const UserConfigSchema = strictTable({
  identity: IdentitySchema.optional(),
  selectedKeys: z.array(z.string()).default([]),
  selectionModel: z.string().optional(),
  overlayRepos: z.array(OverlayRepoSchema).default([]),
});

/** Exported so the manifest module (src/manifest/store.ts) can reuse this validation rather than
 * duplicating it — a manifest's overlayRepos field follows exactly the same rules. */
export function parseOverlayRepos(value: unknown): OverlayRepoConfig[] {
  return parseWith(z.array(OverlayRepoSchema), value);
}

export function parseUserConfig(raw: string): UserConfig {
  const parsed = parseTomlOrThrow(raw, parseToml);
  const config = parseWith(UserConfigSchema, parsed);
  // Zod produces the optional key as `identity: undefined` when absent; omit it entirely so the
  // round-trip through serializeUserConfig stays byte-identical to what was read.
  return {
    ...(config.identity !== undefined ? { identity: config.identity } : {}),
    selectedKeys: config.selectedKeys,
    ...(config.selectionModel !== undefined ? { selectionModel: config.selectionModel } : {}),
    overlayRepos: config.overlayRepos,
  };
}

export function serializeUserConfig(config: UserConfig): string {
  return stringifyToml({ ...config });
}

/** Real wrapper: a missing config file returns documented defaults, not an error — first run. */
/**
 * A *missing* file means "no config yet" and yields documented defaults. Any other failure —
 * permissions, I/O — is rethrown with context rather than being flattened into defaults.
 *
 * That distinction is not academic: swallowing every error meant an unreadable config silently
 * became an empty one, and since the app persists the selection back on change, the next write
 * would overwrite the user's real selections and overlay repos with nothing. Caught when a
 * sandbox run couldn't read its own config file and reported zero overlay repos instead of failing.
 */
export async function readUserConfig(path: string): Promise<UserConfig> {
  let raw: string;
  try {
    raw = await Deno.readTextFile(path);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return defaultUserConfig();
    throw new Error(`could not read config at ${path}: ${(err as Error).message}`, { cause: err });
  }
  return parseUserConfig(raw);
}

/** Creates the parent directory (e.g. `~/.config/autoinstall/`) if it doesn't exist yet — a
 * first-ever run on a fresh machine has no such directory, and `Deno.writeTextFile` only creates
 * the file itself, not missing parent directories (confirmed the hard way in the equivalent
 * history-store function, see its comment). */
export async function writeUserConfig(path: string, config: UserConfig): Promise<void> {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, serializeUserConfig(config));
}
