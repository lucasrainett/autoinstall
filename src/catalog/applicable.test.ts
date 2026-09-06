import { assert, assertEquals } from "@std/assert";
import { appliesTo, entriesForPlatform } from "./applicable.ts";
import type { CatalogEntry } from "./types.ts";

function entry(id: string, platforms: string[]): CatalogEntry {
  const path = `/catalog/x/install/${id}`;
  const ops: Record<string, unknown> = {};
  for (const p of platforms) {
    ops[p] = { detect: `${path}/${p}/detect.sh`, install: `${path}/${p}/install.sh` };
  }
  return {
    categories: ["x"],
    kind: "install",
    id,
    meta: { kind: "install", name: id, description: "d" },
    path,
    platforms: ops,
  } as CatalogEntry;
}

Deno.test("entriesForPlatform - macOS-only software is not offered on Linux", () => {
  // The reported case: Numbers cannot be installed on Linux, so listing it only invites a click
  // that can never do anything.
  const catalog = [entry("numbers", ["macos"]), entry("git", ["linux", "macos", "windows"])];
  assertEquals(entriesForPlatform(catalog, "linux").map((e) => e.id), ["git"]);
});

Deno.test("entriesForPlatform - an entry with a per-platform equivalent stays visible everywhere", () => {
  // Cross-platform equivalents are expressed as one entry with a folder per platform, so they need
  // no special case — this guards against a filter that keys off anything else.
  const streamDeck = entry("stream-deck", ["linux", "macos", "windows"]);
  for (const platform of ["linux", "macos", "windows"] as const) {
    assertEquals(entriesForPlatform([streamDeck], platform).length, 1);
  }
});

Deno.test("entriesForPlatform - Windows-only debloat entries stay off the Linux list", () => {
  const catalog = [entry("xbox-app", ["windows"]), entry("cortana", ["windows"])];
  assertEquals(entriesForPlatform(catalog, "linux"), []);
  assertEquals(entriesForPlatform(catalog, "windows").length, 2);
});

Deno.test("entriesForPlatform - an unknown platform filters nothing, so the list never flickers", () => {
  // The platform is undefined for the first paint of a run. Hiding everything and then restoring
  // it would be worse than showing the unfiltered list for a moment.
  const catalog = [entry("numbers", ["macos"]), entry("git", ["linux"])];
  assertEquals(entriesForPlatform(catalog, undefined).length, 2);
});

Deno.test("entriesForPlatform - preserves the catalog's order", () => {
  const catalog = [entry("a", ["linux"]), entry("mac-only", ["macos"]), entry("b", ["linux"])];
  assertEquals(entriesForPlatform(catalog, "linux").map((e) => e.id), ["a", "b"]);
});

Deno.test("appliesTo - reports per-platform applicability directly", () => {
  const numbers = entry("numbers", ["macos"]);
  assert(appliesTo(numbers, "macos"));
  assert(!appliesTo(numbers, "linux"));
});
