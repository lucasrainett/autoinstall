import { assert, assertEquals } from "@std/assert";
import { runScript } from "./runner.ts";

async function tempScript(contents: string): Promise<string> {
  const path = await Deno.makeTempFile({ suffix: ".sh" });
  await Deno.writeTextFile(path, contents);
  return path;
}

Deno.test("runScript - captures exit code 0", async () => {
  const script = await tempScript("#!/usr/bin/env bash\nexit 0\n");
  const result = await runScript(script);
  assertEquals(result.exitCode, 0);
  assertEquals(result.timedOut, false);
  await Deno.remove(script);
});

Deno.test("runScript - captures a non-zero exit code", async () => {
  const script = await tempScript("#!/usr/bin/env bash\nexit 7\n");
  const result = await runScript(script);
  assertEquals(result.exitCode, 7);
  await Deno.remove(script);
});

Deno.test("runScript - captures stdout and stderr as separate streams", async () => {
  const script = await tempScript(
    "#!/usr/bin/env bash\necho 'to stdout'\necho 'to stderr' >&2\n",
  );
  const result = await runScript(script);
  assertEquals(result.stdout.trim(), "to stdout");
  assertEquals(result.stderr.trim(), "to stderr");
  await Deno.remove(script);
});

Deno.test("runScript - passes through the working directory", async () => {
  const dir = await Deno.makeTempDir();
  const script = await tempScript("#!/usr/bin/env bash\npwd\n");
  const result = await runScript(script, { cwd: dir });
  // Compare realpaths in case of symlink differences (e.g. /tmp vs /private/tmp on macOS).
  assertEquals(await Deno.realPath(result.stdout.trim()), await Deno.realPath(dir));
  await Deno.remove(script);
  await Deno.remove(dir);
});

Deno.test("runScript - passes through environment variables, merged with the inherited environment", async () => {
  const script = await tempScript('#!/usr/bin/env bash\necho "VALUE=$MY_TEST_VAR"\n');
  const result = await runScript(script, { env: { MY_TEST_VAR: "hello" } });
  assertEquals(result.stdout.trim(), "VALUE=hello");
  await Deno.remove(script);
});

Deno.test("runScript - enforces the timeout and reports it distinctly from a normal failure", async () => {
  const script = await tempScript("#!/usr/bin/env bash\nsleep 5\nexit 0\n");
  const start = Date.now();
  const result = await runScript(script, { timeoutMs: 100 });
  const elapsedMs = Date.now() - start;
  assertEquals(result.timedOut, true);
  assertEquals(result.exitCode, null);
  assert(
    elapsedMs < 2000,
    `expected the timeout to actually cut the run short, took ${elapsedMs}ms`,
  );
  await Deno.remove(script);
});

Deno.test("runScript - a timeout also reclaims a backgrounded descendant holding the output pipe open", async () => {
  // Regression test: killing only the direct child isn't enough here, because the backgrounded
  // `sleep` inherits the piped stdout/stderr file descriptors and keeps them open even after the
  // script itself (bash) exits — without process-group killing, this made a 100ms timeout take
  // the full 5 seconds to resolve. Note the script's own exit code (0) is lost in this scenario:
  // the runner can't distinguish "bash is still running" from "bash exited but a descendant is
  // still holding the pipe open" without extra bookkeeping, so this reports timedOut rather than
  // the real exit code — a documented tradeoff, not something callers should rely on scripts doing.
  const script = await tempScript("#!/usr/bin/env bash\nsleep 5 &\nexit 0\n");
  const start = Date.now();
  const result = await runScript(script, { timeoutMs: 300 });
  const elapsedMs = Date.now() - start;
  assertEquals(result.timedOut, true);
  assert(
    elapsedMs < 2000,
    `expected the backgrounded process to be reclaimed quickly, took ${elapsedMs}ms`,
  );
  await Deno.remove(script);
});

Deno.test("runScript - preserveControllingTerminal still runs the script and captures its output", async () => {
  // The elevated path (see plan-runner.ts): skips setsid so the script keeps the caller's
  // terminal, which is what lets its own `sudo` call match the credential cached up front.
  const script = await tempScript("#!/usr/bin/env bash\necho 'ran'\nexit 0\n");
  const result = await runScript(script, { preserveControllingTerminal: true });
  assertEquals(result.exitCode, 0);
  assertEquals(result.stdout.trim(), "ran");
  await Deno.remove(script);
});

Deno.test("runScript - preserveControllingTerminal still returns promptly on timeout, even though a descendant survives", async () => {
  // The elevated path has no process group to kill, so a descendant can outlive the shell. What
  // must still hold is that the *call* returns on time — otherwise a hung install would freeze
  // the whole app with no way out. The orphaned descendant is a known, documented cost; blocking
  // forever is not.
  const script = await tempScript("#!/usr/bin/env bash\nsleep 2\nexit 0\n");
  const start = Date.now();
  const result = await runScript(script, { preserveControllingTerminal: true, timeoutMs: 100 });
  const elapsedMs = Date.now() - start;
  assertEquals(result.timedOut, true);
  assertEquals(result.exitCode, null);
  assert(
    elapsedMs < 1500,
    `the timeout must actually bound the call even with a surviving descendant, took ${elapsedMs}ms`,
  );
  await Deno.remove(script);
});

Deno.test("runScript - the default (session-isolated) path does cut a plain long-running script short, unlike the elevated path", async () => {
  // The contrast that justifies keeping setsid as the default for everything that doesn't need
  // sudo: same script, same timeout, genuinely reclaimed here.
  const script = await tempScript("#!/usr/bin/env bash\nsleep 2\nexit 0\n");
  const start = Date.now();
  const result = await runScript(script, { timeoutMs: 100 });
  const elapsedMs = Date.now() - start;
  assertEquals(result.timedOut, true);
  assert(
    elapsedMs < 1500,
    `expected the process group to be reclaimed quickly, took ${elapsedMs}ms`,
  );
  await Deno.remove(script);
});

Deno.test("runScript - does not report a timeout for a script that finishes in time", async () => {
  const script = await tempScript("#!/usr/bin/env bash\nexit 0\n");
  const result = await runScript(script, { timeoutMs: 5000 });
  assertEquals(result.timedOut, false);
  assertEquals(result.exitCode, 0);
  await Deno.remove(script);
});

Deno.test({
  name: "runScript - a timeout returns promptly even when a descendant survives and holds the pipe",
  // The surviving `sleep` keeps a process handle alive past the test, which is exactly the
  // condition being asserted; the sanitizers would otherwise flag that as a leak.
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    // The elevated path has no process group to kill, so the backgrounded child outlives the
    // shell and keeps the output pipe open. Awaiting that pipe would hang forever — which is what
    // a real hung install would have done to the whole app, since nothing bounded it before.
    const script = await tempScript("#!/usr/bin/env bash\nsleep 30 &\nsleep 30\n");
    const start = Date.now();
    const result = await runScript(script, {
      timeoutMs: 500,
      preserveControllingTerminal: true,
    });
    const elapsedMs = Date.now() - start;
    assertEquals(result.timedOut, true);
    assertEquals(result.exitCode, null);
    assert(
      elapsedMs < 5000,
      `the call must return on timeout rather than waiting on the orphan, took ${elapsedMs}ms`,
    );
    await Deno.remove(script);
  },
});
