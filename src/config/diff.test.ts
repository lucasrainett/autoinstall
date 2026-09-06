import { assertEquals } from "@std/assert";
import { diffSelections } from "./diff.ts";

const CATALOG = new Set([
  "signal",
  "disable-telemetry",
  "zen-browser",
]);

Deno.test("diffSelections - identifies newly added selections", () => {
  const diff = diffSelections(
    new Set(["signal"]),
    new Set(["signal", "zen-browser"]),
    CATALOG,
  );
  assertEquals(diff.added, ["zen-browser"]);
});

Deno.test("diffSelections - identifies removed selections that still exist in the catalog", () => {
  const diff = diffSelections(
    new Set(["signal", "zen-browser"]),
    new Set(["signal"]),
    CATALOG,
  );
  assertEquals(diff.removed, ["zen-browser"]);
});

Deno.test("diffSelections - identifies unchanged selections", () => {
  const diff = diffSelections(
    new Set(["signal"]),
    new Set(["signal", "zen-browser"]),
    CATALOG,
  );
  assertEquals(diff.unchanged, ["signal"]);
});

Deno.test("diffSelections - a previously-selected entry no longer in the catalog is its own category, not just 'removed'", () => {
  const diff = diffSelections(
    new Set(["signal", "discontinued-app"]),
    new Set(["signal"]),
    CATALOG, // discontinued-app isn't in the catalog anymore
  );
  assertEquals(diff.noLongerInCatalog, ["discontinued-app"]);
  assertEquals(diff.removed, []); // not double-counted as an ordinary "removed" entry
});

Deno.test("diffSelections - no changes produces empty added/removed, full unchanged", () => {
  const same = new Set(["signal"]);
  const diff = diffSelections(same, same, CATALOG);
  assertEquals(diff.added, []);
  assertEquals(diff.removed, []);
  assertEquals(diff.unchanged, ["signal"]);
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
