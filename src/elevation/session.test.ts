import { assertEquals } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import {
  releaseSudoAccess,
  requestSudoAccess,
  startSudoKeepAlive,
  type SudoRunner,
} from "./session.ts";

function recordingRunner(result = true): { runner: SudoRunner; calls: string[][] } {
  const calls: string[][] = [];
  const runner: SudoRunner = (args) => {
    calls.push([...args]);
    return Promise.resolve(result);
  };
  return { runner, calls };
}

Deno.test("requestSudoAccess - runs `sudo -v` and returns its result", async () => {
  const { runner, calls } = recordingRunner(true);
  assertEquals(await requestSudoAccess(runner), true);
  assertEquals(calls, [["-v"]]);
});

Deno.test("requestSudoAccess - propagates a failed/declined prompt", async () => {
  const { runner } = recordingRunner(false);
  assertEquals(await requestSudoAccess(runner), false);
});

Deno.test("startSudoKeepAlive - refreshes via `sudo -n true` immediately, then on interval", () => {
  using time = new FakeTime();
  const { runner, calls } = recordingRunner(true);
  const handle = startSudoKeepAlive(runner, 60_000);
  assertEquals(calls, [["-n", "true"]]);
  time.tick(60_000);
  assertEquals(calls, [["-n", "true"], ["-n", "true"]]);
  handle.stop();
});

Deno.test("startSudoKeepAlive - stop() halts further refreshes", () => {
  using time = new FakeTime();
  const { runner, calls } = recordingRunner(true);
  const handle = startSudoKeepAlive(runner, 1000);
  handle.stop();
  time.tick(10_000);
  assertEquals(calls, [["-n", "true"]]); // only the immediate call, none from the (stopped) timer
});

Deno.test("startSudoKeepAlive - a rejected refresh doesn't throw or stop the loop", () => {
  using time = new FakeTime();
  let callCount = 0;
  const runner: SudoRunner = () => {
    callCount++;
    return Promise.reject(new Error("boom"));
  };
  const handle = startSudoKeepAlive(runner, 1000);
  time.tick(1000);
  assertEquals(callCount, 2);
  handle.stop();
});

Deno.test("releaseSudoAccess - runs `sudo -k`", async () => {
  const { runner, calls } = recordingRunner(true);
  await releaseSudoAccess(runner);
  assertEquals(calls, [["-k"]]);
});

Deno.test("releaseSudoAccess - a rejected call doesn't throw, and still attempted the release", async () => {
  // Previously this asserted nothing and passed purely by not throwing, so it could not tell a
  // working implementation from one that silently skipped the call.
  let attempted: string[] | undefined;
  const runner: SudoRunner = (args) => {
    attempted = [...args];
    return Promise.reject(new Error("boom"));
  };
  let threw = false;
  try {
    await releaseSudoAccess(runner);
  } catch {
    threw = true;
  }
  assertEquals(threw, false, "a failed release must be swallowed, not propagated");
  assertEquals(attempted, ["-k"], "it must still have attempted the real release");
});
