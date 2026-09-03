import { entryKey } from "../catalog/types.ts";
import { assertEquals } from "@std/assert";
import { computePlan } from "./compute.ts";
import type { CatalogEntry } from "../catalog/types.ts";
import type { DiagnosticSnapshotEntry } from "../diagnostics/scan.ts";

function entry(
  overrides: Partial<CatalogEntry> & Pick<CatalogEntry, "category" | "kind" | "id">,
): CatalogEntry {
  const path = `/catalog/${overrides.category}/${overrides.kind}/${overrides.id}`;
  return {
    meta: { name: overrides.id, description: "test entry" },
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
  const signal = entry({ category: "communication", kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(["communication/install/signal"]), [
    unsatisfied("communication/install/signal"),
  ]);
  assertEquals(plan.actions, [
    {
      key: "communication/install/signal",
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
  const signal = entry({ category: "communication", kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(["communication/install/signal"]), [
    satisfied("communication/install/signal"),
  ]);
  assertEquals(plan.actions, []);
  assertEquals(plan.skipped, [{
    key: "communication/install/signal",
    reason: "already-satisfied",
  }]);
});

Deno.test("computePlan - a deselected-but-installed entry is planned for removal", () => {
  // The selection states desired machine state, not a to-do list: unchecking something that is
  // present means "I don't want this", so it is removed. This deliberately replaces the earlier
  // behaviour where a deselected entry was skipped entirely and unchecking did nothing at all.
  const signal = entry({ category: "communication", kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(), [
    satisfied("communication/install/signal"), // installed, but the user unchecked it
  ]);
  assertEquals(plan.actions.length, 1);
  assertEquals(plan.actions[0].actionKind, "remove");
  assertEquals(plan.actions[0].scriptPath, "/catalog/communication/install/signal/linux/remove.sh");
});

Deno.test("computePlan - a deselected entry that is already absent produces nothing", () => {
  // The desired state already holds, so there is nothing to do. This is the case that keeps a
  // fresh machine safe: an empty selection must not mean "remove everything in the catalog".
  const signal = entry({ category: "communication", kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(), [
    unsatisfied("communication/install/signal"),
  ]);
  assertEquals(plan.actions, []);
  assertEquals(plan.skipped, []);
});

Deno.test("computePlan - a deselected entry with no remove script is left alone, not force-removed", () => {
  const noRemove = entry({ category: "communication", kind: "install", id: "signal" });
  noRemove.platforms.linux = { detect: "/d.sh", install: "/i.sh" };
  const plan = computePlan([noRemove], "linux", new Set(), [
    satisfied("communication/install/signal"),
  ]);
  assertEquals(plan.actions, []);
});

Deno.test("computePlan - deselecting a cleanup entry reinstalls, because remove.sh is that kind's undo", () => {
  // A cleanup entry's operations invert: its remove.sh reinstalls the software. Planning a plain
  // `remove` action is therefore correct for every kind without special-casing.
  const rhythmbox = entry({ category: "media", kind: "cleanup", id: "rhythmbox" });
  const plan = computePlan([rhythmbox], "linux", new Set(), [
    satisfied("media/cleanup/rhythmbox"), // "satisfied" for a cleanup entry means already removed
  ]);
  assertEquals(plan.actions.length, 1);
  assertEquals(plan.actions[0].scriptPath, "/catalog/media/cleanup/rhythmbox/linux/remove.sh");
});

Deno.test("computePlan - a configure-kind entry gets the 'configure' action label", () => {
  const telemetry = entry({ category: "privacy", kind: "configure", id: "disable-telemetry" });
  const plan = computePlan([telemetry], "linux", new Set(["privacy/configure/disable-telemetry"]), [
    unsatisfied("privacy/configure/disable-telemetry"),
  ]);
  assertEquals(plan.actions[0].actionKind, "configure");
});

Deno.test("computePlan - a cleanup-kind entry gets the 'remove' action label, running its install operation", () => {
  const removeBrave = entry({ category: "browsers", kind: "cleanup", id: "remove-brave" });
  const plan = computePlan([removeBrave], "linux", new Set(["browsers/cleanup/remove-brave"]), [
    unsatisfied("browsers/cleanup/remove-brave"), // unsatisfied = bloat still present, cleanup not yet done
  ]);
  assertEquals(plan.actions[0].actionKind, "remove");
  assertEquals(plan.actions[0].scriptPath, removeBrave.platforms.linux!.install);
});

Deno.test("computePlan - needs-update uses the update script when present", () => {
  const signal = entry({
    category: "communication",
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
  const plan = computePlan([signal], "linux", new Set(["communication/install/signal"]), [
    needsUpdate("communication/install/signal"),
  ], { updateKeys: new Set(["communication/install/signal"]) });
  assertEquals(plan.actions[0].actionKind, "update");
  assertEquals(plan.actions[0].scriptPath, "/x/update.sh");
});

Deno.test("computePlan - needs-update falls back to the install script when no update script exists", () => {
  const signal = entry({ category: "communication", kind: "install", id: "signal" }); // no update.sh
  const plan = computePlan([signal], "linux", new Set(["communication/install/signal"]), [
    needsUpdate("communication/install/signal"),
  ], { updateKeys: new Set(["communication/install/signal"]) });
  assertEquals(plan.actions[0].actionKind, "update");
  assertEquals(plan.actions[0].scriptPath, signal.platforms.linux!.install);
});

Deno.test("computePlan - an entry not applicable to the current platform is excluded, even if selected", () => {
  const signal = entry({ category: "communication", kind: "install", id: "signal" }); // linux only
  const plan = computePlan([signal], "windows", new Set(["communication/install/signal"]), [
    unsatisfied("communication/install/signal"),
  ]);
  assertEquals(plan.actions, []);
  assertEquals(plan.skipped, []);
});

Deno.test("computePlan - an entry with no diagnostic result (or an error result) is excluded, not guessed at", () => {
  const signal = entry({ category: "communication", kind: "install", id: "signal" });
  const noSnapshot = computePlan([signal], "linux", new Set(["communication/install/signal"]), []);
  assertEquals(noSnapshot.actions, []);

  const errorSnapshot = computePlan([signal], "linux", new Set(["communication/install/signal"]), [
    { key: "communication/install/signal", result: { ok: false, error: "boom" } },
  ]);
  assertEquals(errorSnapshot.actions, []);
});

Deno.test("computePlan - destructive is carried through from meta", () => {
  const diskCheck = entry({
    category: "security",
    kind: "configure",
    id: "enable-disk-check",
    meta: { name: "Disk Check", description: "test", destructive: true },
  });
  const plan = computePlan(
    [diskCheck],
    "linux",
    new Set(["security/configure/enable-disk-check"]),
    [
      unsatisfied("security/configure/enable-disk-check"),
    ],
  );
  assertEquals(plan.actions[0].destructive, true);
});

Deno.test("computePlan - requiresElevation resolves per-platform: true only on a platform actually listed", () => {
  const protonMail = entry({
    category: "communication",
    kind: "install",
    id: "proton-mail",
    meta: {
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
    new Set(["communication/install/proton-mail"]),
    [unsatisfied("communication/install/proton-mail")],
  );
  assertEquals(linuxPlan.actions[0].requiresElevation, true);

  const macosPlan = computePlan(
    [protonMail],
    "macos",
    new Set(["communication/install/proton-mail"]),
    [unsatisfied("communication/install/proton-mail")],
  );
  assertEquals(macosPlan.actions[0].requiresElevation, false);
});

Deno.test("computePlan - requiresElevation defaults to false everywhere when absent from meta", () => {
  const signal = entry({ category: "communication", kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(["communication/install/signal"]), [
    unsatisfied("communication/install/signal"),
  ]);
  assertEquals(plan.actions[0].requiresElevation, false);
});

Deno.test("computePlan - multiple selected entries produce actions in catalog order", () => {
  const a = entry({ category: "communication", kind: "install", id: "signal" });
  const b = entry({ category: "privacy", kind: "configure", id: "disable-telemetry" });
  const plan = computePlan(
    [a, b],
    "linux",
    new Set(["communication/install/signal", "privacy/configure/disable-telemetry"]),
    [
      unsatisfied("communication/install/signal"),
      unsatisfied("privacy/configure/disable-telemetry"),
    ],
  );
  assertEquals(plan.actions.map((a) => a.key), [
    "communication/install/signal",
    "privacy/configure/disable-telemetry",
  ]);
});

Deno.test("computePlan - a removal is flagged destructive without the entry having to say so", () => {
  // PROJECT_DEFINITION §14 promises nothing destructive runs without the user seeing it named in
  // the plan. Since unchecking a box is what triggers a removal, relying on each entry to set
  // `destructive` left that promise unkept: no entry set it, so the marker never appeared.
  const signal = entry({ category: "communication", kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(), [
    satisfied("communication/install/signal"),
  ]);
  assertEquals(plan.actions[0].actionKind, "remove");
  assertEquals(plan.actions[0].destructive, true);
});

Deno.test("computePlan - installing is not destructive by default", () => {
  const signal = entry({ category: "communication", kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(["communication/install/signal"]), [
    unsatisfied("communication/install/signal"),
  ]);
  assertEquals(plan.actions[0].actionKind, "install");
  assertEquals(plan.actions[0].destructive, false);
});

Deno.test("computePlan - an entry that declares itself destructive keeps that on install too", () => {
  const risky = entry({ category: "security", kind: "configure", id: "wipe-something" });
  risky.meta = { ...risky.meta, destructive: true };
  const plan = computePlan([risky], "linux", new Set(["security/configure/wipe-something"]), [
    unsatisfied("security/configure/wipe-something"),
  ]);
  assertEquals(plan.actions[0].destructive, true);
});

Deno.test("computePlan - marking one entry for update does not update the others", () => {
  // The checkbox cannot express update intent, so it is carried per entry. Marking one must not
  // drag the rest along — that was the original complaint in a different form.
  const signal = entry({ category: "communication", kind: "install", id: "signal" });
  const git = entry({ category: "dev-tools", kind: "install", id: "git" });
  const selected = new Set(["communication/install/signal", "dev-tools/install/git"]);
  const plan = computePlan([signal, git], "linux", selected, [
    needsUpdate("communication/install/signal"),
    needsUpdate("dev-tools/install/git"),
  ], { updateKeys: new Set(["communication/install/signal"]) });
  assertEquals(plan.actions.length, 1);
  assertEquals(plan.actions[0].key, "communication/install/signal");
  assertEquals(plan.actions[0].actionKind, "update");
});

Deno.test("computePlan - an available update is NOT an action unless it is asked for", () => {
  // Reported by the user: unchecking one entry to remove it produced a plan that also updated
  // everything else on the machine. A plan must contain what the user asked for and nothing else.
  const signal = entry({ category: "communication", kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(["communication/install/signal"]), [
    needsUpdate("communication/install/signal"),
  ]);
  assertEquals(plan.actions.length, 0);
  assertEquals(plan.skipped, [{ key: "communication/install/signal", reason: "update-available" }]);
});

Deno.test("computePlan - removing one entry does not sweep in unrelated updates", () => {
  // The exact reported shape: one deliberate removal, several outdated-but-untouched entries.
  const removing = entry({ category: "media", kind: "install", id: "vlc" });
  const outdated = [
    entry({ category: "communication", kind: "install", id: "signal" }),
    entry({ category: "dev-tools", kind: "install", id: "git" }),
    entry({ category: "browsers", kind: "install", id: "brave" }),
  ];
  const selected = new Set(outdated.map(entryKey));
  const plan = computePlan([removing, ...outdated], "linux", selected, [
    satisfied("media/install/vlc"),
    ...outdated.map((e) => needsUpdate(entryKey(e))),
  ]);
  assertEquals(plan.actions.length, 1);
  assertEquals(plan.actions[0].actionKind, "remove");
  assertEquals(plan.actions[0].key, "media/install/vlc");
  assertEquals(plan.skipped.filter((s) => s.reason === "update-available").length, 3);
});

Deno.test("computePlan - an entry marked for update is planned as an update", () => {
  const signal = entry({ category: "communication", kind: "install", id: "signal" });
  const plan = computePlan([signal], "linux", new Set(["communication/install/signal"]), [
    needsUpdate("communication/install/signal"),
  ], { updateKeys: new Set(["communication/install/signal"]) });
  assertEquals(plan.actions.length, 1);
  assertEquals(plan.actions[0].actionKind, "update");
  assertEquals(plan.skipped.length, 0);
});
