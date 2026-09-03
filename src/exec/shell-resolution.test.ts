import { assertEquals } from "@std/assert";
import { resetShellResolutionCache, resolveScriptShell } from "./shell-resolution.ts";

const FOUND = () =>
  Promise.resolve({ ok: true as const, path: "C:\\Program Files\\Git\\bin\\bash.exe" });
const MISSING = () =>
  Promise.resolve({ ok: false as const, error: "Git for Windows was not found." });

Deno.test("resolveScriptShell - POSIX needs no resolution, since bash is already on PATH", async () => {
  resetShellResolutionCache();
  assertEquals(await resolveScriptShell("linux", FOUND), {});
  assertEquals(await resolveScriptShell("darwin", FOUND), {});
});

Deno.test("resolveScriptShell - Windows resolves to the absolute Git Bash path", async () => {
  // Without this the runner falls back to a bare "bash", which is not on PATH on a stock Windows
  // machine — every catalog script would fail on a spawn error naming a binary the user has no
  // reason to have installed.
  resetShellResolutionCache();
  assertEquals(await resolveScriptShell("windows", FOUND), {
    shell: "C:\\Program Files\\Git\\bin\\bash.exe",
  });
});

Deno.test("resolveScriptShell - a missing Git Bash is reported, not silently ignored", async () => {
  resetShellResolutionCache();
  const result = await resolveScriptShell("windows", MISSING);
  assertEquals(result.shell, undefined);
  assertEquals(result.error?.includes("Git for Windows"), true);
});

Deno.test("resolveScriptShell - resolves once and reuses the answer", async () => {
  // The scan runs a detect script per entry (~80 of them); probing the filesystem each time would
  // be pure waste, and the answer cannot change mid-run.
  resetShellResolutionCache();
  let calls = 0;
  const counting = () => {
    calls++;
    return FOUND();
  };
  await resolveScriptShell("windows", counting);
  await resolveScriptShell("windows", counting);
  await resolveScriptShell("windows", counting);
  assertEquals(calls, 1);
});

Deno.test("resolveScriptShell - a failure is cached too, so it isn't re-probed per entry", async () => {
  resetShellResolutionCache();
  let calls = 0;
  const counting = () => {
    calls++;
    return MISSING();
  };
  await resolveScriptShell("windows", counting);
  const second = await resolveScriptShell("windows", counting);
  assertEquals(calls, 1);
  assertEquals(second.error?.includes("Git for Windows"), true);
});
