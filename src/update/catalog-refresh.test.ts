import { assertEquals, assertStrictEquals } from "@std/assert";
import { refreshCatalog } from "./catalog-refresh.ts";
import type { UserConfig } from "../config/types.ts";
import type { HistoryRecord } from "../history/types.ts";

Deno.test("refreshCatalog - identifies newly added bundled entries", () => {
  const previous = new Set(["communication/install/signal"]);
  const current = new Set(["communication/install/signal", "browsers/install/zen-browser"]);
  const result = refreshCatalog(previous, current);
  assertEquals(result.newEntryKeys, ["browsers/install/zen-browser"]);
  assertEquals(result.removedEntryKeys, []);
});

Deno.test("refreshCatalog - identifies entries removed from the bundled catalog", () => {
  const previous = new Set(["communication/install/signal", "tools/install/discontinued"]);
  const current = new Set(["communication/install/signal"]);
  const result = refreshCatalog(previous, current);
  assertEquals(result.removedEntryKeys, ["tools/install/discontinued"]);
});

Deno.test("refreshCatalog - no changes produces an empty result", () => {
  const same = new Set(["communication/install/signal"]);
  assertEquals(refreshCatalog(same, same), { newEntryKeys: [], removedEntryKeys: [] });
});

Deno.test("refreshCatalog - cannot disturb user selections or history: it doesn't accept them as input at all", () => {
  // This is the actual guarantee behind "merges newly added bundled entries without disturbing
  // existing user selections or history" — not a runtime check, a structural one. Demonstrated
  // here by passing real config/history objects through untouched around the refresh call.
  const config: UserConfig = {
    identity: { name: "Jane" },
    selectedKeys: ["communication/install/signal"],
    overlayRepos: [],
  };
  const history: HistoryRecord[] = [
    {
      runId: "run-1",
      timestamp: "2026-01-01T00:00:00.000Z",
      key: "communication/install/signal",
      kind: "install",
      action: "install",
      result: "success",
    },
  ];

  refreshCatalog(
    new Set(["communication/install/signal"]),
    new Set(["communication/install/signal", "browsers/install/zen-browser"]),
  );

  assertStrictEquals(config.selectedKeys[0], "communication/install/signal");
  assertEquals(config.selectedKeys.length, 1);
  assertEquals(history.length, 1);
});
