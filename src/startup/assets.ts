// Makes the catalog usable from a compiled single binary.
//
// The problem this solves, found by actually compiling one rather than assuming: `deno compile`
// resolves `new URL("../../catalog", import.meta.url)` to a *virtual* path inside the binary
// (e.g. /tmp/deno-compile-autoinstall/catalog). With `--include` the binary's own Deno APIs can
// read those files, but they do not exist on the real filesystem — verified directly: `bash
// <that path>` reports "No such file or directory", and even a separate Deno process cannot read
// it. Since every catalog operation is executed by spawning `bash <script>`, an embedded catalog
// is unrunnable as-is: the binary loaded all 28 entries and then every single detect silently
// failed, leaving the plan empty.
//
// Two project rules collide here, and both are deliberate: "every operation is an individual
// script file, runnable standalone by hand" (PROJECT_DEFINITION.md §2) and "ship one
// self-contained binary" (Phase 8). Extracting the embedded catalog to a real directory on first
// run satisfies both — the binary stays self-contained, and the scripts become real files that
// bash (and a human debugging one) can execute.

import { dirname, join } from "@std/path";

/** True when running from a `deno compile` binary, where module-relative paths are virtual. */
export function isCompiledBinary(): boolean {
  return (Deno.build as { standalone?: boolean }).standalone === true;
}

async function copyTree(from: string, to: string): Promise<number> {
  let count = 0;
  await Deno.mkdir(to, { recursive: true });
  for await (const entry of Deno.readDir(from)) {
    const src = join(from, entry.name);
    const dest = join(to, entry.name);
    if (entry.isDirectory) {
      count += await copyTree(src, dest);
    } else if (entry.isFile) {
      // Read/write rather than Deno.copyFile: the source may live in the binary's virtual
      // filesystem, which copyFile cannot address.
      await Deno.mkdir(dirname(dest), { recursive: true });
      await Deno.writeTextFile(dest, await Deno.readTextFile(src));
      count++;
    }
  }
  return count;
}

export interface MaterializeResult {
  /** The path to use as the catalog/profiles root — unchanged when not running compiled. */
  root: string;
  /** True when files were actually extracted from the binary. */
  extracted: boolean;
  fileCount: number;
}

/**
 * Returns a directory whose contents are readable by *other processes*.
 *
 * When running from source this is a no-op: the real directory is already on disk. When running
 * from a compiled binary the embedded tree is extracted to `cacheDir` and that path is returned.
 * Extraction is unconditional rather than cached-on-first-run so that upgrading the binary can
 * never leave a stale catalog behind — the cost is copying a few hundred small text files.
 */
export async function materializeAssetDir(
  embeddedRoot: string,
  cacheDir: string,
): Promise<MaterializeResult> {
  if (!isCompiledBinary()) {
    return { root: embeddedRoot, extracted: false, fileCount: 0 };
  }
  // Replace wholesale: a partial leftover from an interrupted extraction would otherwise look
  // like a valid catalog with entries missing.
  try {
    await Deno.remove(cacheDir, { recursive: true });
  } catch {
    // absent is the normal case on a first run
  }
  const fileCount = await copyTree(embeddedRoot, cacheDir);
  return { root: cacheDir, extracted: true, fileCount };
}
