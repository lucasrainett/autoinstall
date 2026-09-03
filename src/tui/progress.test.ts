import { assertEquals } from "@std/assert";
import { executePlanActions, initializeProgress, transition } from "./progress.ts";

Deno.test("initializeProgress - every key starts pending", () => {
  const state = initializeProgress(["a", "b"]);
  assertEquals(state.get("a"), { key: "a", status: "pending" });
  assertEquals(state.get("b"), { key: "b", status: "pending" });
});

Deno.test("transition - the valid sequence pending -> running -> success is allowed", () => {
  let state = initializeProgress(["a"]);
  state = transition(state, "a", "running");
  assertEquals(state.get("a")?.status, "running");
  state = transition(state, "a", "success");
  assertEquals(state.get("a")?.status, "success");
});

Deno.test("transition - the valid sequence pending -> running -> failed carries the message", () => {
  let state = initializeProgress(["a"]);
  state = transition(state, "a", "running");
  state = transition(state, "a", "failed", "boom");
  assertEquals(state.get("a"), { key: "a", status: "failed", message: "boom" });
});

Deno.test("transition - pending -> skipped is allowed directly, without passing through running", () => {
  let state = initializeProgress(["a"]);
  state = transition(state, "a", "skipped");
  assertEquals(state.get("a")?.status, "skipped");
});

Deno.test("transition - rejects skipping straight from pending to success (must pass through running)", () => {
  const state = initializeProgress(["a"]);
  let threw = false;
  try {
    transition(state, "a", "success");
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("transition - rejects a transition out of a terminal state (success can't go back to running)", () => {
  let state = initializeProgress(["a"]);
  state = transition(state, "a", "running");
  state = transition(state, "a", "success");
  let threw = false;
  try {
    transition(state, "a", "running");
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("transition - rejects an unknown key", () => {
  const state = initializeProgress(["a"]);
  let threw = false;
  try {
    transition(state, "nonexistent", "running");
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("executePlanActions - a failing action does not block subsequent entries from running", async () => {
  const progressSnapshots: string[][] = [];
  const results = await executePlanActions(
    [{ key: "a" }, { key: "b" }, { key: "c" }],
    (key) =>
      key === "b"
        ? Promise.resolve({ ok: false, error: "b failed" })
        : Promise.resolve({ ok: true }),
    (state) => progressSnapshots.push([...state.values()].map((e) => `${e.key}:${e.status}`)),
  );

  assertEquals(results, [
    { key: "a", status: "success" },
    { key: "b", status: "failed", message: "b failed" },
    { key: "c", status: "success" }, // reached despite b's failure — the actual point of this test
  ]);
});

Deno.test("executePlanActions - an operation that throws is recorded as failed, not a crash, and doesn't block later entries", async () => {
  const results = await executePlanActions(
    [{ key: "a" }, { key: "b" }],
    (key) => key === "a" ? Promise.reject(new Error("thrown boom")) : Promise.resolve({ ok: true }),
    () => {},
  );
  assertEquals(results[0], { key: "a", status: "failed", message: "thrown boom" });
  assertEquals(results[1], { key: "b", status: "success" });
});

Deno.test("executePlanActions - shouldAbort skips every remaining action without running it", async () => {
  let calls = 0;
  const results = await executePlanActions(
    [{ key: "a" }, { key: "b" }, { key: "c" }],
    () => {
      calls++;
      return Promise.resolve({ ok: true });
    },
    () => {},
    () => calls >= 1, // abort right after the first action starts running
  );
  assertEquals(results[0].status, "success"); // "a" already started before the abort check
  assertEquals(results[1], { key: "b", status: "skipped" });
  assertEquals(results[2], { key: "c", status: "skipped" });
  assertEquals(calls, 1); // b and c's runOperation was never actually called
});

Deno.test("executePlanActions - reports progress transitions in order via onProgress", async () => {
  const seen: string[] = [];
  await executePlanActions(
    [{ key: "a" }],
    () => Promise.resolve({ ok: true }),
    (state) => seen.push(state.get("a")!.status),
  );
  assertEquals(seen, ["pending", "running", "success"]);
});

Deno.test("executePlanActions - a successful action's note is carried into its result", async () => {
  // A removal the collateral guard declined succeeds but did not remove anything. Dropping that
  // note would leave the user believing software was uninstalled while it is still installed.
  const results = await executePlanActions(
    [{ key: "a" }],
    () => Promise.resolve({ ok: true as const, note: "declined — left installed" }),
    () => {},
  );
  assertEquals(results, [
    { key: "a", status: "success", message: "declined — left installed" },
  ]);
});

Deno.test("executePlanActions - a plain success carries no message", async () => {
  const results = await executePlanActions(
    [{ key: "a" }],
    () => Promise.resolve({ ok: true as const }),
    () => {},
  );
  assertEquals(results, [{ key: "a", status: "success" }]);
});
