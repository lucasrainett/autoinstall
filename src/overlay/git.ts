// Overlay repo clone/pull — TASKS.md §1.9. `git` is injected (a GitRunner) so tests never invoke
// a real git binary or touch the network — matching this project's "mocked git operations" test
// convention rather than treating clone/pull as untestable just because the real thing is I/O.

export interface GitRunner {
  run(args: string[], cwd?: string): Promise<{ code: number; stderr: string }>;
}

/** Real wrapper: shells out to the actual `git` binary. */
export const realGitRunner: GitRunner = {
  async run(args, cwd) {
    const command = new Deno.Command("git", { args, cwd, stdout: "piped", stderr: "piped" });
    const output = await command.output();
    return { code: output.code, stderr: new TextDecoder().decode(output.stderr) };
  },
};

export type GitResult = { ok: true } | { ok: false; error: string };

export async function cloneOverlayRepo(
  url: string,
  destDir: string,
  ref: string | undefined,
  git: GitRunner,
): Promise<GitResult> {
  const cloneResult = await git.run(["clone", url, destDir]);
  if (cloneResult.code !== 0) {
    return { ok: false, error: `git clone failed for "${url}": ${cloneResult.stderr.trim()}` };
  }

  if (ref !== undefined) {
    const checkoutResult = await git.run(["checkout", ref], destDir);
    if (checkoutResult.code !== 0) {
      return {
        ok: false,
        error: `git checkout "${ref}" failed for "${url}": ${checkoutResult.stderr.trim()}`,
      };
    }
  }

  return { ok: true };
}

/**
 * Pinned to a ref: fetches and re-checks-out that exact ref every time, so a moved branch HEAD
 * never silently changes behavior for a pinned repo. Unpinned: tracks the latest on whatever
 * branch is currently checked out via a plain `git pull`.
 */
export async function pullOverlayRepo(
  destDir: string,
  ref: string | undefined,
  git: GitRunner,
): Promise<GitResult> {
  if (ref !== undefined) {
    const fetchResult = await git.run(["fetch", "--all"], destDir);
    if (fetchResult.code !== 0) {
      return { ok: false, error: `git fetch failed in "${destDir}": ${fetchResult.stderr.trim()}` };
    }
    const checkoutResult = await git.run(["checkout", ref], destDir);
    if (checkoutResult.code !== 0) {
      return {
        ok: false,
        error: `git checkout "${ref}" failed in "${destDir}": ${checkoutResult.stderr.trim()}`,
      };
    }
    return { ok: true };
  }

  const pullResult = await git.run(["pull"], destDir);
  if (pullResult.code !== 0) {
    return { ok: false, error: `git pull failed in "${destDir}": ${pullResult.stderr.trim()}` };
  }
  return { ok: true };
}
