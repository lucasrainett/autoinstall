import { assertEquals } from "@std/assert";
import { validateProfileAgainstCatalog } from "./validate.ts";
import type { Profile } from "./types.ts";

const CATALOG_KEYS = new Set(["git", "signal"]);

Deno.test("validateProfileAgainstCatalog - every referenced key exists: no issues", () => {
  const profile: Profile = {
    id: "developer",
    name: "Developer",
    description: "x",
    entryKeys: ["git", "signal"],
  };
  assertEquals(validateProfileAgainstCatalog(profile, CATALOG_KEYS), []);
});

Deno.test("validateProfileAgainstCatalog - a nonexistent id is flagged, not silently dropped", () => {
  const profile: Profile = {
    id: "broken-refs",
    name: "Broken Refs",
    description: "x",
    entryKeys: ["git", "does-not-exist"],
  };
  const issues = validateProfileAgainstCatalog(profile, CATALOG_KEYS);
  assertEquals(issues.length, 1);
  assertEquals(issues[0].message.includes("does-not-exist"), true);
  assertEquals(issues[0].path, "profiles/broken-refs.toml");
});

Deno.test("validateProfileAgainstCatalog - an empty entries list has no issues", () => {
  const profile: Profile = { id: "empty", name: "Empty", description: "x", entryKeys: [] };
  assertEquals(validateProfileAgainstCatalog(profile, CATALOG_KEYS), []);
});
