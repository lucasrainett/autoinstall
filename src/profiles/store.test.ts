import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { loadProfileFromUrl, loadProfiles } from "./store.ts";
import { fromFileUrl } from "@std/path";

const FIXTURE_ROOT = fromFileUrl(new URL("./testdata/profiles", import.meta.url));

Deno.test("loadProfiles - loads a valid profile, id from filename", async () => {
  const { profiles, errors } = await loadProfiles(FIXTURE_ROOT);
  assertEquals(errors.filter((e) => e.path.includes("developer")), []);
  const dev = profiles.find((p) => p.id === "developer");
  assert(dev, "expected the developer profile to load");
  assertEquals(dev.name, "Developer");
  assertEquals(dev.entryKeys, ["dev-tools/install/git", "communication/install/signal"]);
});

Deno.test("loadProfiles - a malformed profile is an error, doesn't abort loading the rest", async () => {
  const { profiles, errors } = await loadProfiles(FIXTURE_ROOT);
  assert(!profiles.some((p) => p.id === "broken"));
  const err = errors.find((e) => e.path.includes("broken"));
  assert(err, "expected an error for the broken profile");
  assert(
    profiles.some((p) => p.id === "developer"),
    "a sibling error must not abort the whole load",
  );
});

Deno.test("loadProfiles - a nonexistent profiles directory is a single clear error", async () => {
  const { profiles, errors } = await loadProfiles(`${FIXTURE_ROOT}/does-not-exist`);
  assertEquals(profiles, []);
  assertEquals(errors.length, 1);
});

Deno.test("loadProfileFromUrl - a valid response parses into the same shape as a named profile, tagged untrusted", async () => {
  const raw =
    `name = "Remote"\ndescription = "loaded from a url"\nentries = ["dev-tools/install/git"]\n`;
  const fakeFetch = () => Promise.resolve(new Response(raw, { status: 200 }));
  const result = await loadProfileFromUrl("https://example.com/profile.toml", fakeFetch);
  assert(result.ok);
  assertEquals(result.profile.name, "Remote");
  assertEquals(result.profile.entryKeys, ["dev-tools/install/git"]);
  assertEquals(result.profile.untrusted, true);
  assertEquals(result.profile.sourceUrl, "https://example.com/profile.toml");
  assertEquals(result.profile.rawContents, raw);
});

Deno.test("loadProfileFromUrl - an unreachable URL produces a clear, specific error", async () => {
  const fakeFetch = () => Promise.reject(new Error("network down"));
  const result = await loadProfileFromUrl("https://example.com/profile.toml", fakeFetch);
  assertEquals(result.ok, false);
  if (!result.ok) assertStringIncludes(result.error, "network down");
});

Deno.test("loadProfileFromUrl - a non-2xx response produces a clear error", async () => {
  const fakeFetch = () => Promise.resolve(new Response("not found", { status: 404 }));
  const result = await loadProfileFromUrl("https://example.com/missing.toml", fakeFetch);
  assertEquals(result.ok, false);
  if (!result.ok) assertStringIncludes(result.error, "404");
});

Deno.test("loadProfileFromUrl - malformed content at a reachable URL produces a clear error", async () => {
  const fakeFetch = () => Promise.resolve(new Response("not valid toml [[[", { status: 200 }));
  const result = await loadProfileFromUrl("https://example.com/profile.toml", fakeFetch);
  assertEquals(result.ok, false);
});
