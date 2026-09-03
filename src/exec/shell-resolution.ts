// Decides which shell actually runs catalog scripts on this machine.
//
// Every catalog operation is a .sh file, on Windows too (TASKS.md's file-format rule), so Windows
// needs Git Bash. Nothing called `resolveGitBash` before this module existed, which meant the
// runner fell back to a bare "bash" that is not on PATH on a stock Windows machine — every script
// would have failed with a spawn error naming a binary the user has no reason to have.
//
// Resolved once per process and cached: the answer cannot change during a run, and probing the
// filesystem for every one of ~80 detect scripts would be wasteful.

import { resolveGitBashOnDisk } from "./git-bash.ts";

let cached: string | undefined;
let cachedError: string | undefined;

export interface ShellResolution {
  /** Absolute path to bash.exe on Windows; plain "bash" elsewhere. */
  shell?: string;
  /** Set when Windows has no usable Git Bash — the caller should surface this, not run scripts. */
  error?: string;
}

/** Resets the memoised result. Tests only. */
export function resetShellResolutionCache(): void {
  cached = undefined;
  cachedError = undefined;
}

export async function resolveScriptShell(
  os: string = Deno.build.os,
  resolve: typeof resolveGitBashOnDisk = resolveGitBashOnDisk,
): Promise<ShellResolution> {
  // POSIX: bash is on PATH, and the runner's default is already correct.
  if (os !== "windows") return {};

  if (cached !== undefined) return { shell: cached };
  if (cachedError !== undefined) return { error: cachedError };

  const result = await resolve();
  if (result.ok) {
    cached = result.path;
    return { shell: cached };
  }
  cachedError = result.error;
  return { error: cachedError };
}
