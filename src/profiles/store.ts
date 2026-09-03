import { parse as parseToml } from "@std/toml";
import { z } from "zod";
import { parseTomlOrThrow, parseWith, strictTable } from "../schema/parse.ts";
import type { Profile, UntrustedProfile } from "./types.ts";

const ProfileSchema = strictTable({
  name: z.string().min(1),
  description: z.string().min(1),
  entries: z.array(z.string().min(1)),
});

/** Parses and strictly validates a profile TOML document, without assigning an id — callers
 * attach that themselves (filename for a local profile, the source URL for a remote one), since
 * where the id comes from differs by source. */
function parseProfileFields(raw: string): Omit<Profile, "id"> {
  const parsed = parseTomlOrThrow(raw, parseToml);
  const { name, description, entries } = parseWith(ProfileSchema, parsed);
  return { name, description, entryKeys: entries };
}

export interface ProfileIssue {
  path: string;
  message: string;
}

export interface ProfileLoadResult {
  profiles: Profile[];
  errors: ProfileIssue[];
}

/** Real wrapper: walks a flat `profiles/` directory (one .toml file per profile, not nested like
 * the catalog), tolerant of individual bad files — one malformed profile doesn't block the rest. */
export async function loadProfiles(profilesRoot: string): Promise<ProfileLoadResult> {
  const profiles: Profile[] = [];
  const errors: ProfileIssue[] = [];

  let entries: Deno.DirEntry[];
  try {
    entries = [];
    for await (const entry of Deno.readDir(profilesRoot)) entries.push(entry);
  } catch {
    return {
      profiles,
      errors: [{ path: profilesRoot, message: "profiles directory does not exist" }],
    };
  }

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile || !entry.name.endsWith(".toml")) continue;
    const path = `${profilesRoot}/${entry.name}`;
    const id = entry.name.slice(0, -".toml".length);
    try {
      const raw = await Deno.readTextFile(path);
      profiles.push({ id, ...parseProfileFields(raw) });
    } catch (err) {
      errors.push({ path, message: (err as Error).message });
    }
  }

  return { profiles, errors };
}

/**
 * Real wrapper: fetches and parses a profile from a pasted URL. Always tagged `untrusted: true`,
 * unconditionally — this is the point of the function, not a default that could be overridden.
 */
export async function loadProfileFromUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; profile: UntrustedProfile } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch (err) {
    return { ok: false, error: `could not reach "${url}" (${(err as Error).message})` };
  }

  if (!response.ok) {
    return { ok: false, error: `"${url}" returned HTTP ${response.status}` };
  }

  const raw = await response.text();

  try {
    const fields = parseProfileFields(raw);
    return {
      ok: true,
      profile: { id: url, ...fields, untrusted: true, sourceUrl: url, rawContents: raw },
    };
  } catch (err) {
    return { ok: false, error: `"${url}" is not a valid profile (${(err as Error).message})` };
  }
}
