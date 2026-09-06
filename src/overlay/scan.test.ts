import { assert, assertEquals } from "@std/assert";
import { scanOverlayCatalog } from "./scan.ts";
import { fromFileUrl } from "@std/path";

const FIXTURE_ROOT = fromFileUrl(new URL("./testdata/overlay-catalog", import.meta.url));

Deno.test("scanOverlayCatalog - an override entry with no meta.toml has meta undefined (inherit from core)", async () => {
  const { entries } = await scanOverlayCatalog(FIXTURE_ROOT);
  const steam = entries.find((e) => e.id === "steam");
  assert(steam, "expected the steam override entry");
  assertEquals(steam.meta, undefined);
  assertEquals(Object.keys(steam.platforms.linux!), ["install"]);
});

Deno.test("scanOverlayCatalog - a new (additive) entry with its own meta.toml has meta populated", async () => {
  const { entries } = await scanOverlayCatalog(FIXTURE_ROOT);
  const tool = entries.find((e) => e.id === "my-tool");
  assert(tool, "expected the my-tool entry");
  assertEquals(tool.meta?.name, "My Tool");
  assertEquals(Object.keys(tool.platforms.linux!).sort(), ["detect", "install"]);
});

Deno.test("scanOverlayCatalog - an invalid kind value is an error, doesn't abort the scan", async () => {
  const { entries, errors } = await scanOverlayCatalog(FIXTURE_ROOT);
  assert(!entries.some((e) => e.id === "typo"));
  assert(errors.some((e) => e.path.includes("typo")));
  assert(entries.some((e) => e.id === "steam"), "a sibling error must not abort the whole scan");
});

Deno.test("scanOverlayCatalog - a malformed meta.toml (when provided) is an error, same rules as the core loader", async () => {
  const { entries, errors } = await scanOverlayCatalog(FIXTURE_ROOT);
  assert(!entries.some((e) => e.id === "broken-meta"));
  assert(errors.some((e) => e.path.includes("broken-meta")));
});

Deno.test("scanOverlayCatalog - a missing catalog/ directory in the overlay repo is valid, not an error", async () => {
  const result = await scanOverlayCatalog(`${FIXTURE_ROOT}/does-not-exist`);
  assertEquals(result, { entries: [], errors: [] });
});
