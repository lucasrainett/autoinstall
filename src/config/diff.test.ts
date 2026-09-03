import { assertEquals } from "@std/assert";
import { diffSelections } from "./diff.ts";

const CATALOG = new Set([
  "communication/install/signal",
  "privacy/configure/disable-telemetry",
  "browsers/install/zen-browser",
]);

Deno.test("diffSelections - identifies newly added selections", () => {
  const diff = diffSelections(
    new Set(["communication/install/signal"]),
    new Set(["communication/install/signal", "browsers/install/zen-browser"]),
    CATALOG,
  );
  assertEquals(diff.added, ["browsers/install/zen-browser"]);
});

Deno.test("diffSelections - identifies removed selections that still exist in the catalog", () => {
  const diff = diffSelections(
    new Set(["communication/install/signal", "browsers/install/zen-browser"]),
    new Set(["communication/install/signal"]),
    CATALOG,
  );
  assertEquals(diff.removed, ["browsers/install/zen-browser"]);
});

Deno.test("diffSelections - identifies unchanged selections", () => {
  const diff = diffSelections(
    new Set(["communication/install/signal"]),
    new Set(["communication/install/signal", "browsers/install/zen-browser"]),
    CATALOG,
  );
  assertEquals(diff.unchanged, ["communication/install/signal"]);
});

Deno.test("diffSelections - a previously-selected entry no longer in the catalog is its own category, not just 'removed'", () => {
  const diff = diffSelections(
    new Set(["communication/install/signal", "tools/install/discontinued-app"]),
    new Set(["communication/install/signal"]),
    CATALOG, // discontinued-app isn't in the catalog anymore
  );
  assertEquals(diff.noLongerInCatalog, ["tools/install/discontinued-app"]);
  assertEquals(diff.removed, []); // not double-counted as an ordinary "removed" entry
});

Deno.test("diffSelections - no changes produces empty added/removed, full unchanged", () => {
  const same = new Set(["communication/install/signal"]);
  const diff = diffSelections(same, same, CATALOG);
  assertEquals(diff.added, []);
  assertEquals(diff.removed, []);
  assertEquals(diff.unchanged, ["communication/install/signal"]);
  assertEquals(diff.noLongerInCatalog, []);
});

Deno.test("diffSelections - empty previous and current produces all-empty diff", () => {
  assertEquals(diffSelections(new Set(), new Set(), CATALOG), {
    added: [],
    removed: [],
    unchanged: [],
    noLongerInCatalog: [],
  });
});
