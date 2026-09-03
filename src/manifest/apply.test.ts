import { assertEquals } from "@std/assert";
import { importManifest } from "./apply.ts";
import type { Manifest } from "./types.ts";

const CATALOG_KEYS = new Set([
  "communication/install/signal",
  "privacy/configure/disable-telemetry",
]);

Deno.test("importManifest - every key present in the catalog is carried through with no warnings", () => {
  const manifest: Manifest = {
    selectedKeys: ["communication/install/signal"],
    overlayRepos: [{ url: "git@github.com:jane/my-config.git" }],
  };
  const result = importManifest(manifest, CATALOG_KEYS);
  assertEquals(result.selectedKeys, ["communication/install/signal"]);
  assertEquals(result.overlayRepos, manifest.overlayRepos);
  assertEquals(result.warnings, []);
});

Deno.test("importManifest - a key no longer in the catalog produces a visible warning, not a silent drop", () => {
  const manifest: Manifest = {
    selectedKeys: ["communication/install/signal", "tools/install/discontinued-app"],
    overlayRepos: [],
  };
  const result = importManifest(manifest, CATALOG_KEYS);
  assertEquals(result.selectedKeys, ["communication/install/signal"]); // the valid one still comes through
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("discontinued-app"), true);
});

Deno.test("importManifest - multiple missing keys each produce their own warning", () => {
  const manifest: Manifest = {
    selectedKeys: ["tools/install/gone-a", "tools/install/gone-b"],
    overlayRepos: [],
  };
  const result = importManifest(manifest, CATALOG_KEYS);
  assertEquals(result.selectedKeys, []);
  assertEquals(result.warnings.length, 2);
});

Deno.test("importManifest - an empty manifest imports cleanly with no warnings", () => {
  const result = importManifest({ selectedKeys: [], overlayRepos: [] }, CATALOG_KEYS);
  assertEquals(result, { selectedKeys: [], overlayRepos: [], warnings: [] });
});
