import { assertEquals } from "@std/assert";
import { checkForUpdate, compareVersions } from "./version.ts";

Deno.test("compareVersions - an older current version reports update-available", () => {
  assertEquals(compareVersions("1.0.0", "1.2.0"), "update-available");
});

Deno.test("compareVersions - an equal version reports up-to-date", () => {
  assertEquals(compareVersions("1.2.3", "1.2.3"), "up-to-date");
});

Deno.test("compareVersions - a newer-than-latest current version reports ahead-of-latest (a local dev build)", () => {
  assertEquals(compareVersions("2.0.0", "1.9.9"), "ahead-of-latest");
});

Deno.test("compareVersions - a leading 'v' prefix on either version is tolerated", () => {
  assertEquals(compareVersions("v1.0.0", "1.2.0"), "update-available");
  assertEquals(compareVersions("1.2.0", "v1.2.0"), "up-to-date");
});

Deno.test("compareVersions - compares minor and patch, not just major", () => {
  assertEquals(compareVersions("1.2.3", "1.2.4"), "update-available");
  assertEquals(compareVersions("1.2.4", "1.2.3"), "ahead-of-latest");
  assertEquals(compareVersions("1.2.3", "1.3.0"), "update-available");
});

Deno.test("checkForUpdate - a successful response with a newer release reports update-available", async () => {
  const fakeFetch = () =>
    Promise.resolve(new Response(JSON.stringify({ tag_name: "v2.0.0" }), { status: 200 }));
  const result = await checkForUpdate("1.0.0", "example/autoinstall", fakeFetch);
  assertEquals(result, { ok: true, status: "update-available", latestVersion: "v2.0.0" });
});

Deno.test("checkForUpdate - a network failure produces a clear error", async () => {
  const fakeFetch = () => Promise.reject(new Error("network down"));
  const result = await checkForUpdate("1.0.0", "example/autoinstall", fakeFetch);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error.includes("network down"), true);
});

Deno.test("checkForUpdate - a non-2xx response produces a clear error", async () => {
  const fakeFetch = () => Promise.resolve(new Response("", { status: 404 }));
  const result = await checkForUpdate("1.0.0", "example/autoinstall", fakeFetch);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error.includes("404"), true);
});

Deno.test("checkForUpdate - a response missing tag_name produces a clear error", async () => {
  const fakeFetch = () => Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  const result = await checkForUpdate("1.0.0", "example/autoinstall", fakeFetch);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error.includes("tag_name"), true);
});
