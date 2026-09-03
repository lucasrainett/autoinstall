// Validates the *real* bundled profiles (repo root /profiles) against the real catalog, not
// fixtures — the same class of check bundled.test.ts does for catalog entries. A profile that
// references an entry key which no longer exists would otherwise fail silently at runtime
// (importManifest-style warnings) or quietly select nothing.

import { assert, assertEquals } from "@std/assert";
import { loadProfiles } from "./store.ts";
import { loadCatalog } from "../catalog/loader.ts";
import { entryKey } from "../catalog/types.ts";

const PROFILES_ROOT = new URL("../../profiles", import.meta.url).pathname;
const CATALOG_ROOT = new URL("../../catalog", import.meta.url).pathname;

Deno.test("bundled profiles - all load with zero errors", async () => {
  const { errors } = await loadProfiles(PROFILES_ROOT);
  assertEquals(errors, []);
});

Deno.test("bundled profiles - at least one profile ships, so the picker is not empty", async () => {
  const { profiles } = await loadProfiles(PROFILES_ROOT);
  assert(profiles.length > 0, "expected the repo to ship real profiles");
});

Deno.test("bundled profiles - every referenced entry key exists in the real catalog", async () => {
  const { profiles } = await loadProfiles(PROFILES_ROOT);
  const { entries } = await loadCatalog(CATALOG_ROOT);
  const known = new Set(entries.map(entryKey));

  const dangling: string[] = [];
  for (const profile of profiles) {
    for (const key of profile.entryKeys) {
      if (!known.has(key)) dangling.push(`${profile.id} -> ${key}`);
    }
  }
  assertEquals(dangling, [], `profiles reference entries that don't exist: ${dangling.join(", ")}`);
});

Deno.test("bundled profiles - no profile is empty, which would make selecting it a no-op", async () => {
  const { profiles } = await loadProfiles(PROFILES_ROOT);
  const empty = profiles.filter((p) => p.entryKeys.length === 0).map((p) => p.id);
  assertEquals(empty, []);
});
