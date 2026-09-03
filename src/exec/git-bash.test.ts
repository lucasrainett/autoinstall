import { assertEquals } from "@std/assert";
import { type GitBashLookup, resolveGitBash } from "./git-bash.ts";

function fakeLookup(
  env: Record<string, string>,
  existingFiles: string[],
): GitBashLookup {
  return {
    getEnv: (name) => env[name],
    fileExists: (path) => Promise.resolve(existingFiles.includes(path)),
  };
}

Deno.test("resolveGitBash - finds Git Bash at the default ProgramFiles path", async () => {
  const lookup = fakeLookup(
    { "ProgramFiles": "C:\\Program Files" },
    ["C:\\Program Files\\Git\\bin\\bash.exe"],
  );
  const result = await resolveGitBash(lookup);
  assertEquals(result, { ok: true, path: "C:\\Program Files\\Git\\bin\\bash.exe" });
});

Deno.test("resolveGitBash - falls back to ProgramFiles(x86) if the 64-bit path doesn't exist", async () => {
  const lookup = fakeLookup(
    { "ProgramFiles": "C:\\Program Files", "ProgramFiles(x86)": "C:\\Program Files (x86)" },
    ["C:\\Program Files (x86)\\Git\\bin\\bash.exe"],
  );
  const result = await resolveGitBash(lookup);
  assertEquals(result, { ok: true, path: "C:\\Program Files (x86)\\Git\\bin\\bash.exe" });
});

Deno.test("resolveGitBash - an explicit override env var takes priority over default paths", async () => {
  const lookup = fakeLookup(
    {
      "AUTOINSTALL_GIT_BASH_PATH": "D:\\Tools\\Git\\bin\\bash.exe",
      "ProgramFiles": "C:\\Program Files",
    },
    ["D:\\Tools\\Git\\bin\\bash.exe", "C:\\Program Files\\Git\\bin\\bash.exe"],
  );
  const result = await resolveGitBash(lookup);
  assertEquals(result, { ok: true, path: "D:\\Tools\\Git\\bin\\bash.exe" });
});

Deno.test("resolveGitBash - an override pointing at a nonexistent file is a specific error, not a silent fallback", async () => {
  const lookup = fakeLookup(
    { "AUTOINSTALL_GIT_BASH_PATH": "D:\\nope.exe", "ProgramFiles": "C:\\Program Files" },
    ["C:\\Program Files\\Git\\bin\\bash.exe"],
  );
  const result = await resolveGitBash(lookup);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error.includes("D:\\nope.exe"), true);
});

Deno.test("resolveGitBash - Git for Windows absent entirely produces a clear error", async () => {
  const lookup = fakeLookup({}, []);
  const result = await resolveGitBash(lookup);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error.includes("Git for Windows"), true);
});
