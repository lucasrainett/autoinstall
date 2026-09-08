import { assertEquals, assertStringIncludes } from "@std/assert";
import { runPlanAction } from "./plan-runner.ts";
import type { PlanAction } from "../plan/compute.ts";
import type { ScriptResult } from "./runner.ts";

const ACTION: PlanAction = {
  key: "signal",
  actionKind: "install",
  scriptPath: "/fake/install.sh",
  destructive: false,
  requiresElevation: false,
};

function fakeExecute(result: ScriptResult): () => Promise<ScriptResult> {
  return () => Promise.resolve(result);
}

Deno.test("runPlanAction - exit code 0 is success", async () => {
  const result = await runPlanAction(
    ACTION,
    fakeExecute({ exitCode: 0, stdout: "", stderr: "", timedOut: false }),
  );
  assertEquals(result, { ok: true });
});

Deno.test("runPlanAction - a nonzero exit code is failure, using stderr as the error detail", async () => {
  const result = await runPlanAction(
    ACTION,
    fakeExecute({ exitCode: 1, stdout: "", stderr: "network unreachable\n", timedOut: false }),
  );
  assertEquals(result, { ok: false, error: "network unreachable" });
});

Deno.test("runPlanAction - a nonzero exit code with empty stderr falls back to an exit-code message", () => {
  return runPlanAction(
    ACTION,
    fakeExecute({ exitCode: 7, stdout: "", stderr: "   \n", timedOut: false }),
  ).then((result) => {
    assertEquals(result, { ok: false, error: "exited with code 7" });
  });
});

Deno.test("runPlanAction - a timeout is failure, with a distinct message, even though exitCode is null", async () => {
  const result = await runPlanAction(
    ACTION,
    fakeExecute({ exitCode: null, stdout: "", stderr: "", timedOut: true }),
  );
  assertEquals(result, { ok: false, error: "timed out running /fake/install.sh" });
});

Deno.test("runPlanAction - an elevated action keeps the controlling terminal, so its own sudo call can find the cached credential", async () => {
  // Regression test for a real production failure: sudo's credential cache is keyed by terminal,
  // so a session-isolated (setsid) script never matches the credential acquired up front and dies
  // with "a terminal is required to read the password".
  let seen: { preserveControllingTerminal?: boolean } | undefined;
  await runPlanAction({ ...ACTION, requiresElevation: true }, (_path, options) => {
    seen = options;
    return Promise.resolve({ exitCode: 0, stdout: "", stderr: "", timedOut: false });
  });
  assertEquals(seen?.preserveControllingTerminal, true);
});

Deno.test("runPlanAction - a non-elevated action stays session-isolated, keeping the process-group timeout guarantee", async () => {
  let seen: { preserveControllingTerminal?: boolean } | undefined;
  await runPlanAction(ACTION, (_path, options) => {
    seen = options;
    return Promise.resolve({ exitCode: 0, stdout: "", stderr: "", timedOut: false });
  });
  assertEquals(seen?.preserveControllingTerminal, false);
});

// --- post-action verification -------------------------------------------------------------
// A script exiting 0 means it ran, not that it worked. These cover the gap the user pointed at:
// "we should run the detect after install to check if it worked".

function action(overrides: Partial<PlanAction> = {}): PlanAction {
  return {
    key: "signal",
    actionKind: "install",
    scriptPath: "/x/install.sh",
    detectScript: "/x/detect.sh",
    destructive: false,
    requiresElevation: false,
    ...overrides,
  };
}

/** Scripts a fake runner resolves by path, so the action and its detect can differ. */
function runnerFor(byPath: Record<string, { exitCode: number }>) {
  return (path: string) =>
    Promise.resolve({
      exitCode: byPath[path]?.exitCode ?? 0,
      stdout: "",
      stderr: "",
      timedOut: false,
    });
}

Deno.test("runPlanAction - an install whose detect still reports absent is a failure, not a success", () => {
  // The exact silent failure this check exists for: the installer exits 0 having done nothing.
  return runPlanAction(
    action(),
    runnerFor({ "/x/install.sh": { exitCode: 0 }, "/x/detect.sh": { exitCode: 1 } }),
  ).then((result) => {
    assertEquals(result.ok, false);
    assertStringIncludes(
      result.ok === false ? result.error : "",
      "still not present",
    );
  });
});

Deno.test("runPlanAction - an install confirmed present afterwards succeeds", async () => {
  const result = await runPlanAction(
    action(),
    runnerFor({ "/x/install.sh": { exitCode: 0 }, "/x/detect.sh": { exitCode: 0 } }),
  );
  assertEquals(result.ok, true);
});

Deno.test("runPlanAction - a removal whose detect still reports present is a failure", async () => {
  const result = await runPlanAction(
    action({ actionKind: "remove", scriptPath: "/x/remove.sh" }),
    runnerFor({ "/x/remove.sh": { exitCode: 0 }, "/x/detect.sh": { exitCode: 0 } }),
  );
  assertEquals(result.ok, false);
  assertStringIncludes(result.ok === false ? result.error : "", "still present");
});

Deno.test("runPlanAction - a removal the guard declined is reported as declined, not failed", async () => {
  // The collateral guard exits 3 and leaves the package installed on purpose. Calling that a
  // failure would punish the tool for making the right call.
  const result = await runPlanAction(
    action({ actionKind: "remove", scriptPath: "/x/remove.sh" }),
    runnerFor({ "/x/remove.sh": { exitCode: 3 } }),
  );
  assertEquals(result.ok, true);
  assertStringIncludes(result.ok === true ? result.note ?? "" : "", "declined");
});

Deno.test("runPlanAction - an update still reporting an update available afterwards is a failure", async () => {
  const result = await runPlanAction(
    action({ actionKind: "update" }),
    runnerFor({ "/x/install.sh": { exitCode: 0 }, "/x/detect.sh": { exitCode: 2 } }),
  );
  assertEquals(result.ok, false);
  assertStringIncludes(result.ok === false ? result.error : "", "update is still available");
});

Deno.test("runPlanAction - an install is fine if detect reports an update available afterwards", async () => {
  // "Installed but a newer version exists" still satisfies an install; only an *update* action
  // has to land on the newest version.
  const result = await runPlanAction(
    action(),
    runnerFor({ "/x/install.sh": { exitCode: 0 }, "/x/detect.sh": { exitCode: 2 } }),
  );
  assertEquals(result.ok, true);
});

Deno.test("runPlanAction - an unverifiable detect leaves the action successful but says so", async () => {
  // The action worked as far as anyone can tell; only the check is inconclusive. Inventing either
  // verdict would be worse than reporting the uncertainty.
  const result = await runPlanAction(
    action(),
    runnerFor({ "/x/install.sh": { exitCode: 0 }, "/x/detect.sh": { exitCode: 99 } }),
  );
  assertEquals(result.ok, true);
  assertStringIncludes(result.ok === true ? result.note ?? "" : "", "could not verify");
});

Deno.test("runPlanAction - an action with no detect script simply is not verified", async () => {
  const bare = action();
  delete (bare as { detectScript?: string }).detectScript;
  const result = await runPlanAction(bare, runnerFor({ "/x/install.sh": { exitCode: 0 } }));
  assertEquals(result.ok, true);
});

Deno.test("runPlanAction - a removal is re-checked, so an async uninstaller is not called a failure", async () => {
  // Windows uninstallers frequently return before they have finished: winget reports
  // "Successfully uninstalled" once it has launched one. Observed with VLC on a real runner, where
  // the removal genuinely worked and the immediate re-check still saw it installed.
  let detects = 0;
  const execute = ((script: string) => {
    if (script.endsWith("remove.sh")) {
      return Promise.resolve({ exitCode: 0, stdout: "", stderr: "", timedOut: false });
    }
    detects++;
    // Still present on the first two checks, gone by the third.
    return Promise.resolve({
      exitCode: detects < 3 ? 0 : 1,
      stdout: "",
      stderr: "",
      timedOut: false,
    });
  }) as unknown as Parameters<typeof runPlanAction>[1];

  const result = await runPlanAction(
    {
      key: "vlc",
      actionKind: "remove",
      scriptPath: "/catalog/vlc/windows/remove.sh",
      detectScript: "/catalog/vlc/windows/detect.sh",
      requiresElevation: false,
      destructive: true,
    } as Parameters<typeof runPlanAction>[0],
    execute,
  );
  assertEquals(result, { ok: true });
  assertEquals(detects >= 3, true, `gave up after ${detects} checks`);
});

Deno.test("runPlanAction - a removal that never takes effect is still a failure", async () => {
  // The retry must not become "eventually give up and call it success", which would hide every
  // genuinely failed removal.
  const execute = (() =>
    Promise.resolve({
      exitCode: 0, // remove succeeds, and detect keeps reporting present
      stdout: "",
      stderr: "",
      timedOut: false,
    })) as unknown as Parameters<typeof runPlanAction>[1];

  const result = await runPlanAction(
    {
      key: "vlc",
      actionKind: "remove",
      scriptPath: "/catalog/vlc/windows/remove.sh",
      detectScript: "/catalog/vlc/windows/detect.sh",
      requiresElevation: false,
      destructive: true,
    } as Parameters<typeof runPlanAction>[0],
    execute,
  );
  assertEquals(result.ok, false);
});
