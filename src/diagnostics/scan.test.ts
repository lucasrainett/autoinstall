import { assertEquals } from "@std/assert";
import { runDiagnosticScan } from "./scan.ts";
import type { CatalogEntry } from "../catalog/types.ts";
import type { ScriptResult } from "../exec/runner.ts";

function entry(
  overrides: Partial<CatalogEntry> & Pick<CatalogEntry, "categories" | "kind" | "id">,
): CatalogEntry {
  const path = `/catalog/${overrides.id}`;
  return {
    meta: { kind: "install", name: overrides.id, description: "test entry" },
    path,
    // A realistic, per-entry detect path — not a shared literal — so tests that route mock
    // behavior by inspecting the path (e.g. "does this path belong to the broken entry")
    // actually distinguish between entries instead of matching every one of them.
    platforms: {
      linux: { detect: `${path}/linux/detect.sh`, install: `${path}/linux/install.sh` },
    },
    ...overrides,
  };
}

function okResult(exitCode: number): ScriptResult {
  return { exitCode, stdout: "", stderr: "", timedOut: false };
}

Deno.test("runDiagnosticScan - one snapshot record per applicable entry", async () => {
  const entries = [
    entry({ categories: ["communication"], kind: "install", id: "signal" }),
    entry({ categories: ["privacy"], kind: "configure", id: "disable-telemetry" }),
  ];
  const snapshot = await runDiagnosticScan(entries, "linux", () => Promise.resolve(okResult(0)));

  assertEquals(snapshot.length, 2);
  assertEquals(snapshot[0], {
    key: "signal",
    result: { ok: true, state: "satisfied" },
  });
  assertEquals(snapshot[1], {
    key: "disable-telemetry",
    result: { ok: true, state: "satisfied" },
  });
});

Deno.test("runDiagnosticScan - excludes entries not applicable to the current platform, without an error", async () => {
  const entries = [entry({ categories: ["communication"], kind: "install", id: "signal" })]; // linux only
  const snapshot = await runDiagnosticScan(entries, "windows", () => Promise.resolve(okResult(0)));
  assertEquals(snapshot, []);
});

Deno.test("runDiagnosticScan - a detect script throwing is caught as that entry's own error, not aborting the scan", async () => {
  const entries = [
    entry({ categories: ["communication"], kind: "install", id: "signal" }),
    entry({ categories: ["dev-tools"], kind: "install", id: "broken" }),
    entry({ categories: ["productivity"], kind: "install", id: "onlyoffice" }),
  ];

  const snapshot = await runDiagnosticScan(entries, "linux", (path) => {
    if (path.includes("broken")) return Promise.reject(new Error("permission denied"));
    return Promise.resolve(okResult(1));
  });

  assertEquals(snapshot.length, 3);
  assertEquals(snapshot[0].result, { ok: true, state: "unsatisfied" });
  assertEquals(snapshot[1].result.ok, false);
  if (!snapshot[1].result.ok) {
    assertEquals(snapshot[1].result.error.includes("permission denied"), true);
  }
  assertEquals(snapshot[2].result, { ok: true, state: "unsatisfied" }); // scan continued past the broken entry
});

Deno.test("runDiagnosticScan - a detect script's own exit-code-based error surfaces as that entry's state error", async () => {
  const entries = [entry({ categories: ["communication"], kind: "install", id: "signal" })];
  const snapshot = await runDiagnosticScan(entries, "linux", () => Promise.resolve(okResult(127)));
  assertEquals(snapshot[0].result.ok, false);
});

Deno.test("runDiagnosticScan - an empty catalog produces an empty snapshot", async () => {
  const snapshot = await runDiagnosticScan([], "linux", () => Promise.resolve(okResult(0)));
  assertEquals(snapshot, []);
});
