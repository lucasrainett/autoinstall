import { assert, assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { loadCatalog, parseEntryMeta } from "./loader.ts";
import { fromFileUrl } from "@std/path";

const FIXTURE_ROOT = fromFileUrl(new URL("./testdata/mixed", import.meta.url));

Deno.test("loadCatalog - loads the valid entry correctly and infers category/kind/id from directory position", async () => {
  const { entries } = await loadCatalog(FIXTURE_ROOT);

  const signal = entries.find((e) => e.id === "signal");
  assert(signal, "expected the signal entry to load");
  assertEquals(signal.category, "communication");
  assertEquals(signal.kind, "install");
  assertEquals(signal.meta.name, "Signal");
  assertEquals(
    signal.meta.description,
    "End-to-end encrypted messaging app for private communication",
  );
  assertEquals(signal.meta.website, "https://signal.org");
  assertEquals(signal.meta.destructive, undefined);
  assertEquals(signal.meta.platforms, undefined);
});

Deno.test("loadCatalog - parses destructive and per-platform requiresElevation when present", async () => {
  const { entries } = await loadCatalog(FIXTURE_ROOT);
  const diskCheck = entries.find((e) => e.id === "enable-disk-check");
  assert(diskCheck, "expected the enable-disk-check entry to load");
  assertEquals(diskCheck.meta.destructive, true);
  assertEquals(diskCheck.meta.platforms?.linux?.requiresElevation, true);
  assertEquals(diskCheck.meta.platforms?.macos?.requiresElevation, true);
  assertEquals(diskCheck.meta.platforms?.windows?.requiresElevation, true);
});

Deno.test("loadCatalog - rejects a non-boolean destructive field", async () => {
  const { entries, errors } = await loadCatalog(FIXTURE_ROOT);
  assert(!entries.some((e) => e.id === "bad-flag-type"));
  const err = errors.find((e) => e.path.includes("bad-flag-type"));
  assert(err, "expected an error for the bad-flag-type entry");
  assertStringIncludes(err.message, "destructive");
});

Deno.test("loadCatalog - requires website for install-kind entries", async () => {
  const { entries, errors } = await loadCatalog(FIXTURE_ROOT);

  assert(!entries.some((e) => e.id === "missing-website"));
  const err = errors.find((e) => e.path.includes("missing-website"));
  assert(err, "expected an error for the missing-website entry");
  assertStringIncludes(err.message, "website");
});

Deno.test("loadCatalog - does not require website for configure-kind entries", async () => {
  const { entries, errors } = await loadCatalog(FIXTURE_ROOT);

  const telemetry = entries.find((e) => e.id === "disable-telemetry");
  assert(telemetry, "expected the disable-telemetry entry to load despite having no website");
  assertEquals(telemetry.meta.website, undefined);
  assert(!errors.some((e) => e.path.includes("disable-telemetry")));
});

Deno.test("loadCatalog - a platform folder that doesn't exist means 'not applicable', not an error", async () => {
  const { entries, errors } = await loadCatalog(FIXTURE_ROOT);
  const signal = entries.find((e) => e.id === "signal")!;

  assert(!("windows" in signal.platforms), "signal has no windows folder in the fixture");
  assert(
    !errors.some((e) => e.path.includes("signal") && e.message.includes("windows")),
    "absence of a platform folder must not be reported as an error",
  );
});

Deno.test("loadCatalog - an operation script that doesn't exist means 'unsupported', not an error", async () => {
  const { entries, errors } = await loadCatalog(FIXTURE_ROOT);
  const signal = entries.find((e) => e.id === "signal")!;

  assertEquals(Object.keys(signal.platforms.linux!).sort(), ["detect", "install", "remove"]);
  assertEquals(Object.keys(signal.platforms.macos!).sort(), ["detect", "install"]);
  assert(
    !errors.some((e) => e.path.includes("signal")),
    "a missing individual operation script must not be reported as an error",
  );
});

Deno.test("loadCatalog - rejects malformed TOML with a specific, actionable error, without aborting the whole load", async () => {
  const { entries, errors } = await loadCatalog(FIXTURE_ROOT);

  assert(!entries.some((e) => e.id === "broken-toml"), "the broken entry must not be loaded");
  const err = errors.find((e) => e.path.includes("broken-toml"));
  assert(err, "expected an error for the broken-toml entry");
  assertStringIncludes(err.message, "TOML");

  // the rest of the tree must still load despite this one bad entry
  assert(entries.some((e) => e.id === "signal"), "a sibling error must not abort the whole load");
});

Deno.test("loadCatalog - rejects a meta.toml containing an unrecognized field", async () => {
  const { entries, errors } = await loadCatalog(FIXTURE_ROOT);

  assert(!entries.some((e) => e.id === "unknown-field"));
  const err = errors.find((e) => e.path.includes("unknown-field"));
  assert(err, "expected an error for the unknown-field entry");
  assertStringIncludes(err.message, "homepage");
});

Deno.test("loadCatalog - rejects a kind directory name outside the closed set", async () => {
  const { entries, errors } = await loadCatalog(FIXTURE_ROOT);

  assert(!entries.some((e) => e.id === "typo-kind"));
  const err = errors.find((e) => e.path.endsWith("tools/installer"));
  assert(err, "expected an error for the invalid 'installer' kind directory");
  assertStringIncludes(err.message, "installer");
});

Deno.test("loadCatalog - rejects an entry with zero platform folders", async () => {
  const { entries, errors } = await loadCatalog(FIXTURE_ROOT);

  assert(!entries.some((e) => e.id === "no-platforms"));
  const err = errors.find((e) => e.path.includes("no-platforms"));
  assert(err, "expected an error for the no-platforms entry");
  assertStringIncludes(err.message, "no platform folders");
});

Deno.test("loadCatalog - a nonexistent catalog root produces a single clear error, not a crash", async () => {
  const { entries, errors } = await loadCatalog(`${FIXTURE_ROOT}/does-not-exist`);
  assertEquals(entries.length, 0);
  assertEquals(errors.length, 1);
  assertStringIncludes(errors[0].message, "does not exist");
});

Deno.test("parseEntryMeta - platforms is optional and absent when no [linux]/[macos]/[windows] table is given", () => {
  const meta = parseEntryMeta(
    `name = "X"\ndescription = "d"\nwebsite = "https://x.com"\n`,
    "meta.toml",
    "install",
  );
  assertEquals(meta.platforms, undefined);
});

Deno.test("parseEntryMeta - parses installMethod, notes, and requiresElevation together, one table per platform actually given", () => {
  const meta = parseEntryMeta(
    `name = "X"\ndescription = "d"\nwebsite = "https://x.com"\n\n[linux]\ninstallMethod = "deb"\nnotes = "linux note"\nrequiresElevation = true\n\n[macos]\ninstallMethod = "homebrew"\n`,
    "meta.toml",
    "install",
  );
  assertEquals(meta.platforms, {
    linux: { installMethod: "deb", notes: "linux note", requiresElevation: true },
    macos: { installMethod: "homebrew" },
  });
});

Deno.test("parseEntryMeta - rejects an installMethod outside the closed set", () => {
  assertThrows(
    () =>
      parseEntryMeta(
        `name = "X"\ndescription = "d"\nwebsite = "https://x.com"\n\n[linux]\ninstallMethod = "pip"\n`,
        "meta.toml",
        "install",
      ),
    Error,
    "linux.installMethod",
  );
});

Deno.test("parseEntryMeta - a platform table with neither notes nor requiresElevation is fine (empty object)", () => {
  const meta = parseEntryMeta(
    `name = "X"\ndescription = "d"\nwebsite = "https://x.com"\n\n[linux]\n`,
    "meta.toml",
    "install",
  );
  assertEquals(meta.platforms, { linux: {} });
});

Deno.test("parseEntryMeta - rejects an unrecognized field inside a platform table", () => {
  assertThrows(
    () =>
      parseEntryMeta(
        `name = "X"\ndescription = "d"\nwebsite = "https://x.com"\n\n[linux]\nhomepage = "n"\n`,
        "meta.toml",
        "install",
      ),
    Error,
    "homepage",
  );
});

Deno.test("parseEntryMeta - rejects a non-string notes value", () => {
  assertThrows(
    () =>
      parseEntryMeta(
        `name = "X"\ndescription = "d"\nwebsite = "https://x.com"\n\n[linux]\nnotes = 5\n`,
        "meta.toml",
        "install",
      ),
    Error,
    "linux.notes",
  );
});

Deno.test("parseEntryMeta - rejects a non-boolean requiresElevation value", () => {
  assertThrows(
    () =>
      parseEntryMeta(
        `name = "X"\ndescription = "d"\nwebsite = "https://x.com"\n\n[linux]\nrequiresElevation = "yes"\n`,
        "meta.toml",
        "install",
      ),
    Error,
    "linux.requiresElevation",
  );
});

Deno.test("parseEntryMeta - rejects a platform table that isn't a table", () => {
  assertThrows(
    () =>
      parseEntryMeta(
        `name = "X"\ndescription = "d"\nwebsite = "https://x.com"\nlinux = "not a table"\n`,
        "meta.toml",
        "install",
      ),
    Error,
    "must be a table",
  );
});

Deno.test("parseEntryMeta - rejects a top-level platform key outside the closed set", () => {
  assertThrows(
    () =>
      parseEntryMeta(
        `name = "X"\ndescription = "d"\nwebsite = "https://x.com"\n\n[freebsd]\nnotes = "n"\n`,
        "meta.toml",
        "install",
      ),
    Error,
    "freebsd",
  );
});
