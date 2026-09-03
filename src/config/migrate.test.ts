import { assert, assertEquals } from "@std/assert";
import { DESIRED_STATE_MODEL, resolveInitialSelection } from "./migrate.ts";

const keys = (r: { selection: Set<string> }) => [...r.selection].sort();

Deno.test("resolveInitialSelection - a pre-migration config never proposes removing what it never mentioned", () => {
  // The bug this exists to prevent, with the real numbers from the run that found it: six saved
  // keys written under the old "queue of installs" model, on a machine with thirty-five other
  // entries installed. Read as desired state, that config means "remove those thirty-five".
  const saved = ["3d-printing/install/orcaslicer", "dev-tools/install/git"];
  const present = Array.from({ length: 35 }, (_, i) => `cat/install/installed-${i}`);
  const result = resolveInitialSelection({
    savedKeys: saved,
    selectionModel: undefined,
    presentKeys: present,
  });

  for (const key of present) {
    assert(result.selection.has(key), `${key} is installed but was left unchecked — a removal`);
  }
  for (const key of saved) assert(result.selection.has(key), `${key} was deselected by migration`);
  assertEquals(result.selection.size, 37);
  assert(result.needsPersist, "the migrated config must be rewritten to record the new model");
  assert(result.notices.some((n) => n.includes("35")), "the user must be told what was kept");
});

Deno.test("resolveInitialSelection - a migrated config is left alone on the next run", () => {
  // Once the marker is written, the saved selection is authoritative. Re-seeding every run would
  // silently undo a deliberate uncheck, which is exactly what the selection is meant to remember.
  const result = resolveInitialSelection({
    savedKeys: ["a/install/one"],
    selectionModel: DESIRED_STATE_MODEL,
    presentKeys: ["a/install/one", "b/install/two"],
  });
  assertEquals(keys(result), ["a/install/one"]);
  assertEquals(result.needsPersist, false);
  assertEquals(result.notices, []);
});

Deno.test("resolveInitialSelection - deselection still works after migration", () => {
  // Guards against over-correcting: the fix must not make removal impossible. An installed entry
  // absent from a *marked* config is a real uncheck and must stay unchecked.
  const result = resolveInitialSelection({
    savedKeys: ["a/install/one"],
    selectionModel: DESIRED_STATE_MODEL,
    presentKeys: ["a/install/one", "b/install/two"],
  });
  assert(!result.selection.has("b/install/two"));
});

Deno.test("resolveInitialSelection - a genuine first run seeds from the machine", () => {
  const result = resolveInitialSelection({
    savedKeys: [],
    selectionModel: undefined,
    presentKeys: ["a/install/one", "b/install/two"],
  });
  assertEquals(keys(result), ["a/install/one", "b/install/two"]);
  assert(result.notices[0].includes("First run"));
  assert(result.needsPersist);
});

Deno.test("resolveInitialSelection - a first run on an empty machine selects nothing and says nothing", () => {
  const result = resolveInitialSelection({
    savedKeys: [],
    selectionModel: undefined,
    presentKeys: [],
  });
  assertEquals(keys(result), []);
  assertEquals(result.notices, []);
});

Deno.test("resolveInitialSelection - a pre-migration config on a machine with nothing else installed keeps its selection", () => {
  const result = resolveInitialSelection({
    savedKeys: ["a/install/one"],
    selectionModel: undefined,
    presentKeys: ["a/install/one"],
  });
  assertEquals(keys(result), ["a/install/one"]);
  assert(result.notices.some((n) => n.includes("Nothing installed was at risk")));
});

Deno.test("resolveInitialSelection - a newly added entry that is already installed is checked, not removed", () => {
  // The release blocker this exists for: adding entries to the catalog made the next run propose
  // uninstalling software the user already had. The entry is unchecked only because they have
  // never been shown it, and silence is not a decision.
  const result = resolveInitialSelection({
    savedKeys: ["a/install/one"],
    selectionModel: DESIRED_STATE_MODEL,
    presentKeys: ["a/install/one", "media/install/grayjay", "creative/install/minder"],
    newlyKnownKeys: ["media/install/grayjay", "creative/install/minder"],
  });
  assert(result.selection.has("media/install/grayjay"));
  assert(result.selection.has("creative/install/minder"));
  assert(result.needsPersist, "the seeded choice must reach disk or it repeats every launch");
  assert(result.notices[0].includes("newly added"));
});

Deno.test("resolveInitialSelection - a newly added entry that is NOT installed stays unchecked", () => {
  // Seeding must not mean "select everything new" — only "do not propose removing what is there".
  const result = resolveInitialSelection({
    savedKeys: ["a/install/one"],
    selectionModel: DESIRED_STATE_MODEL,
    presentKeys: ["a/install/one"],
    newlyKnownKeys: ["media/install/grayjay"],
  });
  assert(!result.selection.has("media/install/grayjay"));
  assertEquals(result.needsPersist, false);
});

Deno.test("resolveInitialSelection - deliberate deselection still survives a catalog update", () => {
  // The dangerous over-correction: an entry the user has seen and unchecked must stay unchecked
  // even while it is installed, or unchecking anything would be impossible after an update.
  const result = resolveInitialSelection({
    savedKeys: ["a/install/one"],
    selectionModel: DESIRED_STATE_MODEL,
    presentKeys: ["a/install/one", "b/install/unwanted"],
    newlyKnownKeys: ["c/install/brand-new"],
  });
  assert(!result.selection.has("b/install/unwanted"), "an old, seen, unchecked entry must stay so");
});
