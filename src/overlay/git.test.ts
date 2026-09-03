import { assertEquals } from "@std/assert";
import { cloneOverlayRepo, type GitRunner, pullOverlayRepo } from "./git.ts";

function fakeGit(
  responses: Record<string, { code: number; stderr: string }>,
): GitRunner & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    run(args: string[]) {
      calls.push(args);
      const key = args[0]; // route by the git subcommand
      return Promise.resolve(responses[key] ?? { code: 0, stderr: "" });
    },
  };
}

Deno.test("cloneOverlayRepo - a successful clone with no ref does not attempt a checkout", async () => {
  const git = fakeGit({ clone: { code: 0, stderr: "" } });
  const result = await cloneOverlayRepo("git@github.com:x/y.git", "/dest", undefined, git);
  assertEquals(result, { ok: true });
  assertEquals(git.calls, [["clone", "git@github.com:x/y.git", "/dest"]]);
});

Deno.test("cloneOverlayRepo - a successful clone with a ref also checks it out", async () => {
  const git = fakeGit({ clone: { code: 0, stderr: "" }, checkout: { code: 0, stderr: "" } });
  const result = await cloneOverlayRepo("git@github.com:x/y.git", "/dest", "v1.2.3", git);
  assertEquals(result, { ok: true });
  assertEquals(git.calls, [
    ["clone", "git@github.com:x/y.git", "/dest"],
    ["checkout", "v1.2.3"],
  ]);
});

Deno.test("cloneOverlayRepo - a clone failure produces a clear error and never attempts checkout", async () => {
  const git = fakeGit({ clone: { code: 128, stderr: "repository not found" } });
  const result = await cloneOverlayRepo(
    "git@github.com:x/does-not-exist.git",
    "/dest",
    "main",
    git,
  );
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error.includes("repository not found"), true);
  assertEquals(git.calls.length, 1); // no checkout attempted after a failed clone
});

Deno.test("cloneOverlayRepo - a checkout failure after a successful clone is still reported clearly", async () => {
  const git = fakeGit({
    clone: { code: 0, stderr: "" },
    checkout: { code: 1, stderr: "pathspec 'nope' did not match" },
  });
  const result = await cloneOverlayRepo("git@github.com:x/y.git", "/dest", "nope", git);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error.includes("nope"), true);
});

Deno.test("pullOverlayRepo - unpinned just runs a plain pull", async () => {
  const git = fakeGit({ pull: { code: 0, stderr: "" } });
  const result = await pullOverlayRepo("/dest", undefined, git);
  assertEquals(result, { ok: true });
  assertEquals(git.calls, [["pull"]]);
});

Deno.test("pullOverlayRepo - pinned re-fetches and re-checks-out the exact ref, not a plain pull", async () => {
  const git = fakeGit({ fetch: { code: 0, stderr: "" }, checkout: { code: 0, stderr: "" } });
  const result = await pullOverlayRepo("/dest", "v1.2.3", git);
  assertEquals(result, { ok: true });
  assertEquals(git.calls, [["fetch", "--all"], ["checkout", "v1.2.3"]]);
});

Deno.test("pullOverlayRepo - a fetch failure is reported, checkout is never attempted", async () => {
  const git = fakeGit({ fetch: { code: 1, stderr: "could not resolve host" } });
  const result = await pullOverlayRepo("/dest", "main", git);
  assertEquals(result.ok, false);
  assertEquals(git.calls.length, 1);
});
