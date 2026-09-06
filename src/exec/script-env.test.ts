import { assertEquals } from "@std/assert";
import { buildScriptEnv, IDENTITY_EMAIL_VAR, IDENTITY_NAME_VAR } from "./script-env.ts";
import { runPlanAction } from "./plan-runner.ts";
import type { PlanAction } from "../plan/compute.ts";

Deno.test("buildScriptEnv - exports the configured identity under the documented names", () => {
  assertEquals(
    buildScriptEnv({ identity: { name: "Jane Doe", email: "jane@example.com" } }),
    { [IDENTITY_NAME_VAR]: "Jane Doe", [IDENTITY_EMAIL_VAR]: "jane@example.com" },
  );
});

Deno.test("buildScriptEnv - omits what isn't configured, so a script can tell unset from empty", () => {
  // The distinction matters: a script that only checks for a *set* variable would otherwise
  // configure git with an empty name rather than refusing.
  assertEquals(buildScriptEnv({}), {});
  assertEquals(buildScriptEnv({ identity: {} }), {});
  assertEquals(buildScriptEnv({ identity: { name: "Jane" } }), { [IDENTITY_NAME_VAR]: "Jane" });
});

Deno.test("buildScriptEnv - treats whitespace-only values as absent", () => {
  // `-n "$AUTOINSTALL_IDENTITY_NAME"` is true for " ", which would write a blank git identity.
  assertEquals(buildScriptEnv({ identity: { name: "   ", email: "\t" } }), {});
});

Deno.test("buildScriptEnv - trims surrounding whitespace rather than passing it through", () => {
  assertEquals(
    buildScriptEnv({ identity: { name: "  Jane Doe  ", email: " jane@example.com " } }),
    { [IDENTITY_NAME_VAR]: "Jane Doe", [IDENTITY_EMAIL_VAR]: "jane@example.com" },
  );
});

Deno.test("runPlanAction - hands the identity environment to the script it runs", async () => {
  // The whole point of the mechanism: a standalone bash script cannot read the engine's config,
  // so identity has to arrive as environment or entries like git-identity are impossible without
  // hardcoding someone's details in the catalog.
  const action: PlanAction = {
    key: "git-identity",
    actionKind: "configure",
    scriptPath: "/fake/install.sh",
    destructive: false,
    requiresElevation: false,
  };
  let seenEnv: Record<string, string> | undefined;
  await runPlanAction(action, (_path, options) => {
    seenEnv = options?.env;
    return Promise.resolve({ exitCode: 0, stdout: "", stderr: "", timedOut: false });
  }, { [IDENTITY_NAME_VAR]: "Jane Doe" });

  assertEquals(seenEnv, { [IDENTITY_NAME_VAR]: "Jane Doe" });
});

Deno.test("runPlanAction - passes no env key at all when none is supplied", async () => {
  const action: PlanAction = {
    key: "b",
    actionKind: "install",
    scriptPath: "/fake/install.sh",
    destructive: false,
    requiresElevation: false,
  };
  let seen: { env?: Record<string, string> } | undefined;
  await runPlanAction(action, (_path, options) => {
    seen = options;
    return Promise.resolve({ exitCode: 0, stdout: "", stderr: "", timedOut: false });
  });
  assertEquals(seen?.env, undefined);
});
