// Git Bash resolution — TASKS.md §1.3. Locates bash.exe from a Git for Windows install, since
// every catalog operation runs as a .sh script even on Windows (see TASKS.md's file-format rule).
// Pure decision logic over injected filesystem/env lookups, so tests never need a real Windows box.

export interface GitBashLookup {
  fileExists(path: string): Promise<boolean>;
  getEnv(name: string): string | undefined;
}

export type GitBashResolution =
  | { ok: true; path: string }
  | { ok: false; error: string };

const OVERRIDE_ENV_VAR = "AUTOINSTALL_GIT_BASH_PATH";

export async function resolveGitBash(lookup: GitBashLookup): Promise<GitBashResolution> {
  const override = lookup.getEnv(OVERRIDE_ENV_VAR);
  if (override !== undefined) {
    if (await lookup.fileExists(override)) return { ok: true, path: override };
    return {
      ok: false,
      error: `${OVERRIDE_ENV_VAR} is set to "${override}", but no file exists there`,
    };
  }

  const candidates: string[] = [];
  for (const envVar of ["ProgramFiles", "ProgramFiles(x86)"]) {
    const dir = lookup.getEnv(envVar);
    if (dir) candidates.push(`${dir}\\Git\\bin\\bash.exe`);
  }
  // Fixed fallbacks in case those env vars are somehow unset — matches Git for Windows' own defaults.
  candidates.push(
    "C:\\Program Files\\Git\\bin\\bash.exe",
    "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
  );

  for (const candidate of candidates) {
    if (await lookup.fileExists(candidate)) return { ok: true, path: candidate };
  }

  return {
    ok: false,
    error:
      "Git for Windows was not found. Install it to get Git Bash, which this tool needs to run catalog scripts on Windows.",
  };
}

/** Real wrapper: checks the actual filesystem and environment. */
export function resolveGitBashOnDisk(): Promise<GitBashResolution> {
  return resolveGitBash({
    fileExists: async (path) => {
      try {
        const info = await Deno.stat(path);
        return info.isFile;
      } catch {
        return false;
      }
    },
    getEnv: (name) => Deno.env.get(name),
  });
}
