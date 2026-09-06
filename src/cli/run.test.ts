import { assertEquals } from "@std/assert";
import { runCli } from "./run.ts";
import { computePlan } from "../plan/compute.ts";
import { executePlanActions } from "../tui/progress.ts";
import type { CatalogEntry } from "../catalog/types.ts";
import type { DiagnosticSnapshotEntry } from "../diagnostics/scan.ts";
import type { PlanActionResult } from "../exec/plan-runner.ts";

function entry(
  overrides: Partial<CatalogEntry> & Pick<CatalogEntry, "categories" | "kind" | "id">,
): CatalogEntry {
  const path = `/catalog/${overrides.id}`;
  return {
    meta: { kind: "install", name: overrides.id, description: "test entry" },
    path,
    platforms: {
      linux: { detect: `${path}/linux/detect.sh`, install: `${path}/linux/install.sh` },
    },
    ...overrides,
  };
}

function unsatisfied(key: string): DiagnosticSnapshotEntry {
  return { key, result: { ok: true, state: "unsatisfied" } };
}

const SIGNAL = entry({ categories: ["communication"], kind: "install", id: "signal" });
const VLC = entry({ categories: ["multimedia"], kind: "install", id: "vlc" });
const CATALOG = [SIGNAL, VLC];
const SNAPSHOT = [
  unsatisfied("signal"),
  unsatisfied("vlc"),
];

function spyRunAction() {
  const calls: string[] = [];
  const fn = (action: { key: string }) => {
    calls.push(action.key);
    return Promise.resolve({ ok: true } as PlanActionResult);
  };
  return { fn, calls };
}

Deno.test("runCli - throws for 'tui' mode rather than silently doing nothing", async () => {
  let threw = false;
  try {
    await runCli("tui", {
      catalog: CATALOG,
      platform: "linux",
      selectedKeys: new Set(),
      snapshot: SNAPSHOT,
    });
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

for (const selectionSize of [0, 1, 2] as const) {
  Deno.test(`runCli - dry-run never calls the runner, selection size ${selectionSize}`, async () => {
    const selectedKeys = new Set(
      selectionSize === 0 ? [] : selectionSize === 1 ? ["signal"] : ["signal", "vlc"],
    );
    const { fn, calls } = spyRunAction();
    const result = await runCli("dry-run", {
      catalog: CATALOG,
      platform: "linux",
      selectedKeys,
      snapshot: SNAPSHOT,
      runAction: fn,
    });
    assertEquals(result.kind, "dry-run");
    assertEquals(calls, []);
  });
}

Deno.test("runCli - dry-run's plan and rendered text reflect the real selection", async () => {
  const result = await runCli("dry-run", {
    catalog: CATALOG,
    platform: "linux",
    selectedKeys: new Set(["signal"]),
    snapshot: SNAPSHOT,
  });
  if (result.kind !== "dry-run") throw new Error("expected dry-run");
  assertEquals(result.plan.actions.map((a) => a.key), ["signal"]);
  assertEquals(result.renderedPlan.includes("signal"), true);
});

Deno.test("runCli - unattended mode actually runs every action in the plan, in order", async () => {
  const { fn, calls } = spyRunAction();
  const result = await runCli("unattended", {
    catalog: CATALOG,
    platform: "linux",
    selectedKeys: new Set(["signal", "vlc"]),
    snapshot: SNAPSHOT,
    runAction: fn,
  });
  if (result.kind !== "unattended") throw new Error("expected unattended");
  assertEquals(calls, ["signal", "vlc"]);
  assertEquals(result.results.map((r) => r.status), ["success", "success"]);
});

Deno.test("runCli - unattended execution is identical to independently calling computePlan + executePlanActions with the same runner", async () => {
  const platform = "linux";
  const selectedKeys = new Set(["signal", "vlc"]);

  // Deterministic fixture behavior: Signal succeeds, VLC fails — shared by both call paths below.
  const behavior = (key: string): Promise<PlanActionResult> =>
    Promise.resolve(
      key === "vlc" ? { ok: false, error: "network unreachable" } : { ok: true },
    );

  // Path A: what a TUI would do after PlanReviewScreen confirms — compute the plan, then run it
  // directly through the same primitives runCli's unattended mode uses internally.
  const directPlan = computePlan(CATALOG, platform, selectedKeys, SNAPSHOT);
  const directResults = await executePlanActions(
    directPlan.actions,
    (key) => behavior(key),
    () => {},
  );

  // Path B: the --yes CLI path.
  const cliResult = await runCli("unattended", {
    catalog: CATALOG,
    platform,
    selectedKeys,
    snapshot: SNAPSHOT,
    runAction: (action) => behavior(action.key),
  });
  if (cliResult.kind !== "unattended") throw new Error("expected unattended");

  assertEquals(cliResult.plan, directPlan);
  assertEquals(cliResult.results, directResults);
});
