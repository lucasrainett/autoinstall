import { assert, assertEquals } from "@std/assert";
import { isDevelopmentBuild, TOOL_VERSION } from "./version.ts";

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
