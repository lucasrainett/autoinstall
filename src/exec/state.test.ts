import { assertEquals } from "@std/assert";
import { resolveDetectState } from "./state.ts";

Deno.test("resolveDetectState - exit 0 means satisfied", () => {
  assertEquals(resolveDetectState({ exitCode: 0, timedOut: false }), {
    ok: true,
    state: "satisfied",
  });
});

Deno.test("resolveDetectState - exit 1 means unsatisfied", () => {
  assertEquals(resolveDetectState({ exitCode: 1, timedOut: false }), {
    ok: true,
    state: "unsatisfied",
  });
});

Deno.test("resolveDetectState - exit 2 means needs-update", () => {
  assertEquals(resolveDetectState({ exitCode: 2, timedOut: false }), {
    ok: true,
    state: "needs-update",
  });
});

Deno.test("resolveDetectState - an unexpected exit code is an error, not a silent guess", () => {
  const result = resolveDetectState({ exitCode: 127, timedOut: false });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("127"), true);
  }
});

Deno.test("resolveDetectState - a timed-out run is an error", () => {
  const result = resolveDetectState({ exitCode: null, timedOut: true });
  assertEquals(result.ok, false);
});
