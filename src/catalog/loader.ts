import { parse as parseToml } from "@std/toml";
import { z } from "zod";
import { parseTomlOrThrow, parseWith, strictTable } from "../schema/parse.ts";
import { CAPABILITY_NAMES } from "./capabilities.ts";
import {
  type CatalogEntry,
  type CatalogIssue,
  type CatalogLoadResult,
  type EntryMeta,
  INSTALL_METHODS,
  isKind,
  isPlatform,
  type Kind,
  KINDS,
  OPERATIONS,
  type Platform,
  type PlatformMeta,
  type PlatformOperations,
  PLATFORMS,
} from "./types.ts";

export const META_FILENAME = "meta.toml";
const PlatformMetaSchema = strictTable({
  installMethod: z.enum(INSTALL_METHODS).optional(),
  notes: z.string().min(1, "if present, must be a non-empty string").optional(),
  requiresElevation: z.boolean().optional(),
});

/** A meta.toml's top-level fields are the fixed set below, plus one optional table per real
 * platform ("linux"/"macos"/"windows") — see EntryMeta.platforms' doc comment. */
const EntryMetaSchema = strictTable({
  name: z.string().min(1, "is required and must be a non-empty string"),
  description: z.string().min(1, "is required and must be a non-empty string"),
  website: z.string().min(1, "if present, must be a non-empty string").optional(),
  // A closed enum, not free strings: the whole point is comparing the same capability across
  // platforms, and a typo silently creates a second capability that matches nothing.
  capabilities: z.array(z.enum(CAPABILITY_NAMES)).optional(),
  destructive: z.boolean().optional(),
  linux: PlatformMetaSchema.optional(),
  macos: PlatformMetaSchema.optional(),
  windows: PlatformMetaSchema.optional(),
});

/** Exported for the overlay scanner (src/overlay/scan.ts), which walks the same directory shape
 * and must agree exactly with the core loader about what counts as a directory entry. */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await Deno.stat(path)).isDirectory;
  } catch {
    return false;
  }
}

/** Immediate subdirectory names, sorted so catalog loading is deterministic rather than dependent
 * on filesystem ordering. Files and symlinks-to-files are ignored. */
export async function listDirNames(path: string): Promise<string[]> {
  const names: string[] = [];
  try {
    for await (const entry of Deno.readDir(path)) {
      if (entry.isDirectory) names.push(entry.name);
    }
  } catch {
    return [];
  }
  return names.sort();
}

export function parseEntryMeta(raw: string, metaPath: string, kind: Kind): EntryMeta {
  const parsed = parseTomlOrThrow(raw, (r) => parseToml(r));
  const fields = parseWith(EntryMetaSchema, parsed, metaPath);

  // Only assembled when at least one platform table is present, so an entry with none keeps
  // `platforms` absent entirely rather than carrying an empty object.
  const platforms: Partial<Record<Platform, PlatformMeta>> = {};
  for (const platform of PLATFORMS) {
    const value = fields[platform];
    if (value !== undefined) platforms[platform] = value;
  }

  const optionalFlags = {
    ...(fields.destructive !== undefined ? { destructive: fields.destructive } : {}),
    ...(Object.keys(platforms).length > 0 ? { platforms } : {}),
  };

  // Enforced here rather than in the schema because it depends on the entry's kind, which the
  // document itself doesn't carry: an install entry must link somewhere, while a configure or
  // cleanup entry ("disable telemetry") has no meaningful website.
  if (kind === "install") {
    if (fields.website === undefined) {
      throw new Error(`${metaPath}: "website" is required for install-kind entries`);
    }
    return {
      name: fields.name,
      description: fields.description,
      website: fields.website,
      ...(fields.capabilities !== undefined ? { capabilities: fields.capabilities } : {}),
      ...optionalFlags,
    };
  }

  return {
    name: fields.name,
    description: fields.description,
    ...(fields.website !== undefined ? { website: fields.website } : {}),
    ...(fields.capabilities !== undefined ? { capabilities: fields.capabilities } : {}),
    ...optionalFlags,
  };
}

/** Inspects one platform folder and returns which operation scripts are present. Exported for
 * reuse by the overlay scanner (src/overlay/scan.ts) — same rule, same file. */
export async function loadPlatformOperations(platformPath: string): Promise<PlatformOperations> {
  const ops: PlatformOperations = {};
  for (const op of OPERATIONS) {
    const scriptPath = `${platformPath}/${op}.sh`;
    try {
      const info = await Deno.stat(scriptPath);
      if (info.isFile) ops[op] = scriptPath;
    } catch {
      // absent — not supported for this entry/platform, per PROJECT_DEFINITION.md §2
    }
  }
  return ops;
}

/**
 * Walks `catalogRoot` (the on-disk layout: [category]/[kind]/[id]/[platform]/[operation].sh,
 * plus [category]/[kind]/[id]/meta.toml) and builds typed catalog entries.
 *
 * Tolerant of individual bad entries: a problem with one entry is recorded in `errors` and that
 * entry is skipped, it never aborts the whole load.
 */
export async function loadCatalog(catalogRoot: string): Promise<CatalogLoadResult> {
  const entries: CatalogEntry[] = [];
  const errors: CatalogIssue[] = [];

  if (!(await isDirectory(catalogRoot))) {
    return { entries, errors: [{ path: catalogRoot, message: "catalog root does not exist" }] };
  }

  for (const category of await listDirNames(catalogRoot)) {
    const categoryPath = `${catalogRoot}/${category}`;

    for (const kindName of await listDirNames(categoryPath)) {
      const kindPath = `${categoryPath}/${kindName}`;

      if (!isKind(kindName)) {
        errors.push({
          path: kindPath,
          message: `"${kindName}" is not a valid kind (expected one of: ${KINDS.join(", ")})`,
        });
        continue;
      }
      const kind = kindName;

      for (const id of await listDirNames(kindPath)) {
        const entryPath = `${kindPath}/${id}`;
        const metaPath = `${entryPath}/${META_FILENAME}`;

        let meta: EntryMeta;
        try {
          const raw = await Deno.readTextFile(metaPath);
          meta = parseEntryMeta(raw, metaPath, kind);
        } catch (err) {
          errors.push({ path: metaPath, message: (err as Error).message });
          continue;
        }

        const platforms: CatalogEntry["platforms"] = {};
        for (const platformName of await listDirNames(entryPath)) {
          if (!isPlatform(platformName)) {
            errors.push({
              path: `${entryPath}/${platformName}`,
              message: `"${platformName}" is not a valid platform (expected one of: ${
                PLATFORMS.join(", ")
              })`,
            });
            continue;
          }
          platforms[platformName] = await loadPlatformOperations(`${entryPath}/${platformName}`);
        }

        if (Object.keys(platforms).length === 0) {
          errors.push({ path: entryPath, message: "entry has no platform folders at all" });
          continue;
        }

        entries.push({ category, kind, id, meta, path: entryPath, platforms });
      }
    }
  }

  return { entries, errors };
}
