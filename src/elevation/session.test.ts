import { assert, assertEquals } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import {
  realSudoRunner,
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

Deno.test("realSudoRunner - gives up on a prompt that is never answered", async () => {
  // There was no bound at all: an unanswered prompt hung the application forever with no way out
  // but killing the process. Uses `sleep`, which stands in for a sudo prompt nobody answers.
  const runner = realSudoRunner(120);
  const started = Date.now();
  const original = Deno.Command;
  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class {
    #inner: Deno.Command;
    constructor(_cmd: string, _opts: unknown) {
      this.#inner = new original("sleep", { args: ["10"] });
    }
    spawn() {
      return this.#inner.spawn();
    }
  };
  try {
    const granted = await runner(["-v"]);
    assertEquals(granted, false, "an unanswered prompt must not count as granted");
    assert(Date.now() - started < 5000, "it must give up promptly, not wait out the whole prompt");
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = original;
  }
});

Deno.test("realSudoRunner - a spawn that fails outright is 'not granted', never a throw", async () => {
  // This runs from the confirm screen; a throw there would crash the app while asking for a
  // password rather than reporting that elevation was unavailable.
  const original = Deno.Command;
  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class {
    constructor() {
      throw new Deno.errors.NotFound("no sudo here");
    }
  };
  try {
    assertEquals(await realSudoRunner()(["-v"]), false);
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = original;
  }
});
