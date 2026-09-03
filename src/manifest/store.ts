import { parse as parseToml, stringify as stringifyToml } from "@std/toml";
import { dirname } from "@std/path";
import { z } from "zod";
import { parseTomlOrThrow, parseWith, strictTable } from "../schema/parse.ts";
import { OverlayRepoSchema } from "../config/store.ts";
import type { Manifest } from "./types.ts";

const ManifestSchema = strictTable({
  // Required here, unlike in the user config: a manifest exists to reproduce a selection, so one
  // without `selectedKeys` is a malformed document rather than an empty-but-valid setup.
  selectedKeys: z.array(z.string().min(1)),
  overlayRepos: z.array(OverlayRepoSchema).default([]),
});

export function parseManifest(raw: string): Manifest {
  const parsed = parseTomlOrThrow(raw, parseToml);
  return parseWith(ManifestSchema, parsed);
}

export function serializeManifest(manifest: Manifest): string {
  return stringifyToml({ ...manifest });
}

export async function readManifest(path: string): Promise<Manifest> {
  return parseManifest(await Deno.readTextFile(path));
}

/** Creates the parent directory if it doesn't exist yet — same reasoning as the equivalent
 * config-store/history-store functions: `Deno.writeTextFile` only creates the file itself. */
export async function writeManifest(path: string, manifest: Manifest): Promise<void> {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, serializeManifest(manifest));
}
