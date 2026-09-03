import { assertEquals } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { startKeepAlive } from "./keep-alive.ts";

Deno.test("startKeepAlive - refreshes immediately, then once per interval, matching script.sh's existing sudo -n true loop shape", () => {
  using time = new FakeTime();
  let calls = 0;
  const handle = startKeepAlive(() => {
    calls++;
  }, 60_000);

  assertEquals(calls, 1); // fired immediately on start

  time.tick(60_000);
  assertEquals(calls, 2);

  time.tick(60_000 * 3);
  assertEquals(calls, 5);

  handle.stop();
});

Deno.test("startKeepAlive - stop() halts further refreshes", () => {
  using time = new FakeTime();
  let calls = 0;
  const handle = startKeepAlive(() => {
    calls++;
  }, 1000);

  time.tick(1000);
  assertEquals(calls, 2);

  handle.stop();
  time.tick(10_000);
  assertEquals(calls, 2); // no further calls after stop, however much time passes
});
