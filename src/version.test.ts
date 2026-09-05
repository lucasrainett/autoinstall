import { assert, assertEquals } from "@std/assert";
import { DEFAULT_UPDATE_REPO, isDevelopmentBuild, TOOL_VERSION, updateRepo } from "./version.ts";
import { fromFileUrl } from "@std/path";

Deno.test("isDevelopmentBuild - a working-copy build is recognised as one", () => {
  // The update check must stay quiet for these: comparing an untagged build against the latest
  // release would report "out of date" on every run, which is noise rather than information.
  assert(isDevelopmentBuild("0.0.0-dev"));
  assert(isDevelopmentBuild(TOOL_VERSION), "the checked-in default must be a dev version");
});

Deno.test("isDevelopmentBuild - a real release version is not", () => {
  for (const v of ["0.1.0", "1.0.0", "2.3.4"]) assertEquals(isDevelopmentBuild(v), false);
});

Deno.test("the checked-in version is never a plausible release number", () => {
  // Guards the specific failure this replaced: a hardcoded "0.1.0" shipped in every build, so a
  // v0.2.0 release still claimed 0.1.0 and told its users to upgrade to what they already had.
  assertEquals(isDevelopmentBuild(TOOL_VERSION), true);
});

Deno.test("updateRepo - defaults to the project's own repository", () => {
  // This defaulted to nothing for most of the project's life, which meant the update check never
  // ran for anyone: a released binary would silently never mention that a newer one existed.
  assertEquals(updateRepo({ get: () => undefined }), DEFAULT_UPDATE_REPO);
  assertEquals(updateRepo({ get: () => "" }), DEFAULT_UPDATE_REPO);
});

Deno.test("updateRepo - an explicit setting wins, so a fork works unmodified", () => {
  assertEquals(updateRepo({ get: () => "someone/their-fork" }), "someone/their-fork");
});

Deno.test("the installers download from the same repository the tool updates from", async () => {
  // Three files have to agree — src/version.ts, install and install.ps1 — and a release
  // where they disagree fails in a way nobody notices until a user cannot download an upgrade.
  // Checked by reading the scripts rather than by convention, because they are not TypeScript and
  // nothing else would ever catch the drift.
  const root = fromFileUrl(new URL("..", import.meta.url));
  for (const script of ["install", "install.ps1"]) {
    const source = await Deno.readTextFile(`${root}${script}`);
    assert(
      source.includes(DEFAULT_UPDATE_REPO),
      `${script} does not name ${DEFAULT_UPDATE_REPO}; it would download from a different repo ` +
        `than the one the tool checks for updates`,
    );
  }
});
