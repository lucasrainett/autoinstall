import { entryKey } from "../catalog/types.ts";
import { assertEquals } from "@std/assert";
import { computePlan } from "./compute.ts";
import type { CatalogEntry } from "../catalog/types.ts";
import type { DiagnosticSnapshotEntry } from "../diagnostics/scan.ts";

function entry(
  overrides: Partial<CatalogEntry> & Pick<CatalogEntry, "categories" | "kind" | "id">,
): CatalogEntry {
  const path = `/catalog/${overrides.id}`;
  return {
    meta: { kind: "install", name: overrides.id, description: "test entry" },
    path,
    platforms: {
      linux: {
        detect: `${path}/linux/detect.sh`,
        install: `${path}/linux/install.sh`,
        remove: `${path}/linux/remove.sh`,
      },
    },
    ...overrides,
  };
}

function satisfied(key: string): DiagnosticSnapshotEntry {
  return { key, result: { ok: true, state: "satisfied" } };
}
function unsatisfied(key: string): DiagnosticSnapshotEntry {
  return { key, result: { ok: true, state: "unsatisfied" } };
}
function needsUpdate(key: string): DiagnosticSnapshotEntry {
  return { key, result: { ok: true, state: "needs-update" } };
}

Deno.test("computePlan - a selected, unsatisfied install-kind entry produces an install action", () => {
  const signal = entry({ categories: ["communication"], kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(["signal"]), [
    unsatisfied("signal"),
  ]);
  assertEquals(plan.actions, [
    {
      key: "signal",
      actionKind: "install",
      scriptPath: signal.platforms.linux!.install!,
      // Carried so the runner can re-run it after the action and confirm it actually took effect.
      detectScript: signal.platforms.linux!.detect!,
      destructive: false,
      requiresElevation: false,
    },
  ]);
  assertEquals(plan.skipped, []);
});

Deno.test("computePlan - a selected, satisfied entry produces no action, only a skip record", () => {
  const signal = entry({ categories: ["communication"], kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(["signal"]), [
    satisfied("signal"),
  ]);
  assertEquals(plan.actions, []);
  assertEquals(plan.skipped, [{
    key: "signal",
    reason: "already-satisfied",
  }]);
});

Deno.test("computePlan - a deselected-but-installed entry is planned for removal", () => {
  // The selection states desired machine state, not a to-do list: unchecking something that is
  // present means "I don't want this", so it is removed. This deliberately replaces the earlier
  // behaviour where a deselected entry was skipped entirely and unchecking did nothing at all.
  const signal = entry({ categories: ["communication"], kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(), [
    satisfied("signal"), // installed, but the user unchecked it
  ]);
  assertEquals(plan.actions.length, 1);
  assertEquals(plan.actions[0].actionKind, "remove");
  assertEquals(plan.actions[0].scriptPath, "/catalog/signal/linux/remove.sh");
});

Deno.test("computePlan - a deselected entry that is already absent produces nothing", () => {
  // The desired state already holds, so there is nothing to do. This is the case that keeps a
  // fresh machine safe: an empty selection must not mean "remove everything in the catalog".
  const signal = entry({ categories: ["communication"], kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(), [
    unsatisfied("signal"),
  ]);
  assertEquals(plan.actions, []);
  assertEquals(plan.skipped, []);
});

Deno.test("computePlan - a deselected entry with no remove script is left alone, not force-removed", () => {
  const noRemove = entry({ categories: ["communication"], kind: "install", id: "signal" });
  noRemove.platforms.linux = { detect: "/d.sh", install: "/i.sh" };
  const plan = computePlan([noRemove], "linux", new Set(), [
    satisfied("signal"),
  ]);
  assertEquals(plan.actions, []);
});

Deno.test("computePlan - deselecting a cleanup entry reinstalls, because remove.sh is that kind's undo", () => {
  // A cleanup entry's operations invert: its remove.sh reinstalls the software. Planning a plain
  // `remove` action is therefore correct for every kind without special-casing.
  const rhythmbox = entry({ categories: ["media"], kind: "cleanup", id: "rhythmbox" });
  const plan = computePlan([rhythmbox], "linux", new Set(), [
    satisfied("rhythmbox"), // "satisfied" for a cleanup entry means already removed
  ]);
  assertEquals(plan.actions.length, 1);
  assertEquals(plan.actions[0].scriptPath, "/catalog/rhythmbox/linux/remove.sh");
});

Deno.test("computePlan - a configure-kind entry gets the 'configure' action label", () => {
  const telemetry = entry({ categories: ["privacy"], kind: "configure", id: "disable-telemetry" });
  const plan = computePlan([telemetry], "linux", new Set(["disable-telemetry"]), [
    unsatisfied("disable-telemetry"),
  ]);
  assertEquals(plan.actions[0].actionKind, "configure");
});

Deno.test("computePlan - a cleanup-kind entry gets the 'remove' action label, running its install operation", () => {
  const removeBrave = entry({ categories: ["browsers"], kind: "cleanup", id: "remove-brave" });
  const plan = computePlan([removeBrave], "linux", new Set(["remove-brave"]), [
    unsatisfied("remove-brave"), // unsatisfied = bloat still present, cleanup not yet done
  ]);
  assertEquals(plan.actions[0].actionKind, "remove");
  assertEquals(plan.actions[0].scriptPath, removeBrave.platforms.linux!.install);
});

Deno.test("computePlan - needs-update uses the update script when present", () => {
  const signal = entry({
    categories: ["communication"],
    kind: "install",
    id: "signal",
    platforms: {
      linux: {
        detect: "/x/detect.sh",
        install: "/x/install.sh",
        update: "/x/update.sh",
      },
    },
  });
  const plan = computePlan([signal], "linux", new Set(["signal"]), [
    needsUpdate("signal"),
  ], { updateKeys: new Set(["signal"]) });
  assertEquals(plan.actions[0].actionKind, "update");
  assertEquals(plan.actions[0].scriptPath, "/x/update.sh");
});

Deno.test("computePlan - needs-update falls back to the install script when no update script exists", () => {
  const signal = entry({ categories: ["communication"], kind: "install", id: "signal" }); // no update.sh
  const plan = computePlan([signal], "linux", new Set(["signal"]), [
    needsUpdate("signal"),
  ], { updateKeys: new Set(["signal"]) });
  assertEquals(plan.actions[0].actionKind, "update");
  assertEquals(plan.actions[0].scriptPath, signal.platforms.linux!.install);
});

Deno.test("computePlan - an entry not applicable to the current platform is excluded, even if selected", () => {
  const signal = entry({ categories: ["communication"], kind: "install", id: "signal" }); // linux only
  const plan = computePlan([signal], "windows", new Set(["signal"]), [
    unsatisfied("signal"),
  ]);
  assertEquals(plan.actions, []);
  assertEquals(plan.skipped, []);
});

Deno.test("computePlan - an entry with no diagnostic result (or an error result) is excluded, not guessed at", () => {
  const signal = entry({ categories: ["communication"], kind: "install", id: "signal" });
  const noSnapshot = computePlan([signal], "linux", new Set(["signal"]), []);
  assertEquals(noSnapshot.actions, []);

  const errorSnapshot = computePlan([signal], "linux", new Set(["signal"]), [
    { key: "signal", result: { ok: false, error: "boom" } },
  ]);
  assertEquals(errorSnapshot.actions, []);
});

Deno.test("computePlan - destructive is carried through from meta", () => {
  const diskCheck = entry({
    categories: ["security"],
    kind: "configure",
    id: "enable-disk-check",
    meta: {
      kind: "install",
      name: "Disk Check",
      description: "test",
      destructive: true,
    },
  });
  const plan = computePlan(
    [diskCheck],
    "linux",
    new Set(["enable-disk-check"]),
    [
      unsatisfied("enable-disk-check"),
    ],
  );
  assertEquals(plan.actions[0].destructive, true);
});

Deno.test("computePlan - requiresElevation resolves per-platform: true only on a platform actually listed", () => {
  const protonMail = entry({
    categories: ["communication"],
    kind: "install",
    id: "proton-mail",
    meta: {
      kind: "install",
      name: "Proton Mail",
      description: "test",
      platforms: { linux: { requiresElevation: true } },
    },
    platforms: {
      linux: { detect: "/x/linux/detect.sh", install: "/x/linux/install.sh" },
      macos: { detect: "/x/macos/detect.sh", install: "/x/macos/install.sh" },
    },
  });

  const linuxPlan = computePlan(
    [protonMail],
    "linux",
    new Set(["proton-mail"]),
    [unsatisfied("proton-mail")],
  );
  assertEquals(linuxPlan.actions[0].requiresElevation, true);

  const macosPlan = computePlan(
    [protonMail],
    "macos",
    new Set(["proton-mail"]),
    [unsatisfied("proton-mail")],
  );
  assertEquals(macosPlan.actions[0].requiresElevation, false);
});

Deno.test("computePlan - requiresElevation defaults to false everywhere when absent from meta", () => {
  const signal = entry({ categories: ["communication"], kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(["signal"]), [
    unsatisfied("signal"),
  ]);
  assertEquals(plan.actions[0].requiresElevation, false);
});

Deno.test("computePlan - multiple selected entries produce actions in catalog order", () => {
  const a = entry({ categories: ["communication"], kind: "install", id: "signal" });
  const b = entry({ categories: ["privacy"], kind: "configure", id: "disable-telemetry" });
  const plan = computePlan(
    [a, b],
    "linux",
    new Set(["signal", "disable-telemetry"]),
    [
      unsatisfied("signal"),
      unsatisfied("disable-telemetry"),
    ],
  );
  assertEquals(plan.actions.map((a) => a.key), [
    "signal",
    "disable-telemetry",
  ]);
});

Deno.test("computePlan - a removal is flagged destructive without the entry having to say so", () => {
  // PROJECT_DEFINITION §14 promises nothing destructive runs without the user seeing it named in
  // the plan. Since unchecking a box is what triggers a removal, relying on each entry to set
  // `destructive` left that promise unkept: no entry set it, so the marker never appeared.
  const signal = entry({ categories: ["communication"], kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(), [
    satisfied("signal"),
  ]);
  assertEquals(plan.actions[0].actionKind, "remove");
  assertEquals(plan.actions[0].destructive, true);
});

Deno.test("computePlan - installing is not destructive by default", () => {
  const signal = entry({ categories: ["communication"], kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(["signal"]), [
    unsatisfied("signal"),
  ]);
  assertEquals(plan.actions[0].actionKind, "install");
  assertEquals(plan.actions[0].destructive, false);
});

Deno.test("computePlan - an entry that declares itself destructive keeps that on install too", () => {
  const risky = entry({ categories: ["security"], kind: "configure", id: "wipe-something" });
  risky.meta = { ...risky.meta, destructive: true };
  const plan = computePlan([risky], "linux", new Set(["wipe-something"]), [
    unsatisfied("wipe-something"),
  ]);
  assertEquals(plan.actions[0].destructive, true);
});

Deno.test("computePlan - marking one entry for update does not update the others", () => {
  // The checkbox cannot express update intent, so it is carried per entry. Marking one must not
  // drag the rest along — that was the original complaint in a different form.
  const signal = entry({ categories: ["communication"], kind: "install", id: "signal" });
  const git = entry({ categories: ["dev-tools"], kind: "install", id: "git" });
  const selected = new Set(["signal", "git"]);
  const plan = computePlan([signal, git], "linux", selected, [
    needsUpdate("signal"),
    needsUpdate("git"),
  ], { updateKeys: new Set(["signal"]) });
  assertEquals(plan.actions.length, 1);
  assertEquals(plan.actions[0].key, "signal");
  assertEquals(plan.actions[0].actionKind, "update");
});

Deno.test("computePlan - an available update is NOT an action unless it is asked for", () => {
  // Reported by the user: unchecking one entry to remove it produced a plan that also updated
  // everything else on the machine. A plan must contain what the user asked for and nothing else.
  const signal = entry({ categories: ["communication"], kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(["signal"]), [
    needsUpdate("signal"),
  ]);
  assertEquals(plan.actions.length, 0);
  assertEquals(plan.skipped, [{ key: "signal", reason: "update-available" }]);
});

Deno.test("computePlan - removing one entry does not sweep in unrelated updates", () => {
  // The exact reported shape: one deliberate removal, several outdated-but-untouched entries.
  const removing = entry({ categories: ["media"], kind: "install", id: "vlc" });
  const outdated = [
    entry({ categories: ["communication"], kind: "install", id: "signal" }),
    entry({ categories: ["dev-tools"], kind: "install", id: "git" }),
    entry({ categories: ["browsers"], kind: "install", id: "brave" }),
  ];
  const selected = new Set(outdated.map(entryKey));
  const plan = computePlan([removing, ...outdated], "linux", selected, [
    satisfied("vlc"),
    ...outdated.map((e) => needsUpdate(entryKey(e))),
  ]);
  assertEquals(plan.actions.length, 1);
  assertEquals(plan.actions[0].actionKind, "remove");
  assertEquals(plan.actions[0].key, "vlc");
  assertEquals(plan.skipped.filter((s) => s.reason === "update-available").length, 3);
});

Deno.test("computePlan - an entry marked for update is planned as an update", () => {
  const signal = entry({ categories: ["communication"], kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(["signal"]), [
    needsUpdate("signal"),
  ], { updateKeys: new Set(["signal"]) });
  assertEquals(plan.actions.length, 1);
  assertEquals(plan.actions[0].actionKind, "update");
  assertEquals(plan.skipped.length, 0);
});
