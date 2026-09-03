import { assertEquals } from "@std/assert";
import { applyProfile } from "./apply.ts";
import type { Profile } from "./types.ts";

const DEVELOPER: Profile = {
  id: "developer",
  name: "Developer",
  description: "x",
  entryKeys: ["dev-tools/install/git", "communication/install/signal"],
};

const GAMING: Profile = {
  id: "gaming",
  name: "Gaming",
  description: "x",
  entryKeys: ["communication/install/signal", "gaming/install/steam"], // overlaps on signal
};

Deno.test("applyProfile - adds every entry from the profile to the selection", () => {
  const result = applyProfile(new Set(), DEVELOPER);
  assertEquals(result, new Set(["dev-tools/install/git", "communication/install/signal"]));
});

Deno.test("applyProfile - never removes an entry selected from a different source", () => {
  const preexisting = new Set(["privacy/configure/disable-telemetry"]);
  const result = applyProfile(preexisting, DEVELOPER);
  assertEquals(result.has("privacy/configure/disable-telemetry"), true);
  assertEquals(result.has("dev-tools/install/git"), true);
});

Deno.test("applyProfile - applying two overlapping profiles doesn't duplicate entries or throw", () => {
  let selection = new Set<string>();
  selection = applyProfile(selection, DEVELOPER);
  selection = applyProfile(selection, GAMING);
  assertEquals(
    selection,
    new Set(["dev-tools/install/git", "communication/install/signal", "gaming/install/steam"]),
  );
  assertEquals(selection.size, 3); // signal counted once, not twice
});

Deno.test("applyProfile - an empty profile changes nothing", () => {
  const preexisting = new Set(["a", "b"]);
  const empty: Profile = { id: "empty", name: "Empty", description: "x", entryKeys: [] };
  assertEquals(applyProfile(preexisting, empty), new Set(["a", "b"]));
});
