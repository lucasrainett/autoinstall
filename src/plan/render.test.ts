import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderPlan, type UntrustedSource } from "./render.ts";
import type { CatalogEntry } from "../catalog/types.ts";
import type { Plan } from "./compute.ts";

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

Deno.test("renderPlan - an empty plan says there's nothing to do", () => {
  assertEquals(
    renderPlan({ actions: [], skipped: [] }, []),
    "Nothing to do — everything is already how you asked for it.",
  );
});

Deno.test("renderPlan - a routine (non-destructive) plan renders with no destructive marker at all", () => {
  const signal = entry({
    categories: ["communication"],
    kind: "install",
    id: "signal",
    meta: {
      kind: "install",
      name: "Signal",
      description: "x",
      website: "https://signal.org",
    },
  });
  const plan: Plan = {
    actions: [{
      key: "signal",
      actionKind: "install",
      scriptPath: "/x/install.sh",
      destructive: false,
      requiresElevation: false,
    }],
    skipped: [],
  };
  const rendered = renderPlan(plan, [signal]);
  assertStringIncludes(rendered, "Signal");
  assertEquals(rendered.includes("DESTRUCTIVE"), false);
});

Deno.test("renderPlan - a destructive action renders with a distinct marker", () => {
  const diskCheck = entry({
    categories: ["security"],
    kind: "configure",
    id: "enable-disk-check",
    meta: { kind: "install", name: "Disk Encryption Check", description: "x" },
  });
  const plan: Plan = {
    actions: [{
      key: "enable-disk-check",
      actionKind: "configure",
      scriptPath: "/x/install.sh",
      destructive: true,
      requiresElevation: true,
    }],
    skipped: [],
  };
  const rendered = renderPlan(plan, [diskCheck]);
  assertStringIncludes(rendered, "DESTRUCTIVE");
  assertStringIncludes(rendered, "Disk Encryption Check");
  assertStringIncludes(rendered, "requires elevated access");
});

Deno.test("renderPlan - entries needing no action are not listed at all", () => {
  const signal = entry({
    categories: ["communication"],
    kind: "install",
    id: "signal",
    meta: {
      kind: "install",
      name: "Signal",
      description: "x",
      website: "https://signal.org",
    },
  });
  const plan: Plan = {
    actions: [],
    skipped: [{ key: "signal", reason: "already-satisfied" }],
  };
  // The plan answers one question: what is about to change. Listing entries that need no action
  // buried the lines that mattered — reported by the user as "too much noise".
  const rendered = renderPlan(plan, [signal]);
  assertEquals(rendered.includes("Already satisfied"), false);
  assertEquals(rendered.includes("Signal"), false);
  assertStringIncludes(rendered, "Nothing to do");
});

Deno.test("renderPlan - falls back to the raw key if the entry isn't found in the given catalog", () => {
  const plan: Plan = {
    actions: [{
      key: "unknown-entry",
      actionKind: "install",
      scriptPath: "/x/install.sh",
      destructive: false,
      requiresElevation: false,
    }],
    skipped: [],
  };
  assertStringIncludes(renderPlan(plan, []), "unknown-entry");
});

Deno.test("renderPlan - a mixed plan renders its actions distinctly and omits the skipped ones", () => {
  const signal = entry({
    categories: ["communication"],
    kind: "install",
    id: "signal",
    meta: {
      kind: "install",
      name: "Signal",
      description: "x",
      website: "https://signal.org",
    },
  });
  const diskCheck = entry({
    categories: ["security"],
    kind: "configure",
    id: "enable-disk-check",
    meta: {
      kind: "install",
      name: "Disk Encryption Check",
      description: "x",
      destructive: true,
    },
  });
  const other = entry({
    categories: ["browsers"],
    kind: "install",
    id: "zen-browser",
    meta: {
      kind: "install",
      name: "Zen Browser",
      description: "x",
      website: "https://zen-browser.app",
    },
  });

  const plan: Plan = {
    actions: [
      {
        key: "signal",
        actionKind: "install",
        scriptPath: "/x",
        destructive: false,
        requiresElevation: false,
      },
      {
        key: "enable-disk-check",
        actionKind: "configure",
        scriptPath: "/x",
        destructive: true,
        requiresElevation: false,
      },
    ],
    skipped: [{ key: "zen-browser", reason: "already-satisfied" }],
  };

  const rendered = renderPlan(plan, [signal, diskCheck, other]);
  assertStringIncludes(rendered, "Signal");
  assertStringIncludes(rendered, "Disk Encryption Check");
  assertStringIncludes(rendered, "DESTRUCTIVE");
  // Skipped entries stay out of the plan entirely, however many there are.
  assertEquals(rendered.includes("Zen Browser"), false);
  assertEquals(rendered.includes("Already satisfied"), false);
  // exactly one destructive marker — the routine Signal install must not pick one up
  assertEquals(rendered.split("DESTRUCTIVE").length - 1, 1);
});

Deno.test("renderPlan - with no untrusted sources, no untrusted marker or content block appears at all", () => {
  const signal = entry({
    categories: ["communication"],
    kind: "install",
    id: "signal",
    meta: {
      kind: "install",
      name: "Signal",
      description: "x",
      website: "https://signal.org",
    },
  });
  const plan: Plan = {
    actions: [{
      key: "signal",
      actionKind: "install",
      scriptPath: "/x",
      destructive: false,
      requiresElevation: false,
    }],
    skipped: [],
  };
  const rendered = renderPlan(plan, [signal]);
  assertEquals(rendered.includes("UNTRUSTED"), false);
});

Deno.test("renderPlan - an untrusted source's origin and full raw contents are shown before anything else, verbatim", () => {
  const signal = entry({
    categories: ["communication"],
    kind: "install",
    id: "signal",
    meta: {
      kind: "install",
      name: "Signal",
      description: "x",
      website: "https://signal.org",
    },
  });
  const rawContents = 'name = "Remote"\ndescription = "x"\nentries = ["signal"]\n';
  const source: UntrustedSource = {
    origin: "https://example.com/profile.toml",
    rawContents,
    keys: ["signal"],
  };
  const plan: Plan = {
    actions: [{
      key: "signal",
      actionKind: "install",
      scriptPath: "/x",
      destructive: false,
      requiresElevation: false,
    }],
    skipped: [],
  };
  const rendered = renderPlan(plan, [signal], [source]);

  assertStringIncludes(rendered, "UNTRUSTED SOURCE: https://example.com/profile.toml");
  // every line of the raw content appears verbatim (each prefixed as a quoted block, not altered)
  for (const contentLine of rawContents.split("\n").filter((l) => l.length > 0)) {
    assertStringIncludes(rendered, contentLine);
  }
  // the origin block appears before the action list
  assertEquals(
    rendered.indexOf("UNTRUSTED SOURCE") < rendered.indexOf("action(s) will run"),
    true,
  );
});

Deno.test("renderPlan - an entry contributed by an untrusted source is marked, one not from it is not", () => {
  const signal = entry({
    categories: ["communication"],
    kind: "install",
    id: "signal",
    meta: {
      kind: "install",
      name: "Signal",
      description: "x",
      website: "https://signal.org",
    },
  });
  const zen = entry({
    categories: ["browsers"],
    kind: "install",
    id: "zen-browser",
    meta: {
      kind: "install",
      name: "Zen Browser",
      description: "x",
      website: "https://zen-browser.app",
    },
  });
  const source: UntrustedSource = {
    origin: "https://example.com/profile.toml",
    rawContents: "irrelevant here",
    keys: ["signal"],
  };
  const plan: Plan = {
    actions: [
      {
        key: "signal",
        actionKind: "install",
        scriptPath: "/x",
        destructive: false,
        requiresElevation: false,
      },
      {
        key: "zen-browser",
        actionKind: "install",
        scriptPath: "/x",
        destructive: false,
        requiresElevation: false,
      },
    ],
    skipped: [],
  };
  const rendered = renderPlan(plan, [signal, zen], [source]);
  const signalLine = rendered.split("\n").find((l) =>
    l.includes("Signal") && !l.includes("UNTRUSTED SOURCE:")
  )!;
  const zenLine = rendered.split("\n").find((l) => l.includes("Zen Browser"))!;
  assertStringIncludes(signalLine, "[UNTRUSTED SOURCE]");
  assertEquals(zenLine.includes("[UNTRUSTED SOURCE]"), false);
});

Deno.test("renderPlan - an available update that was not marked is not mentioned in the plan", () => {
  // Update intent lives on the entry (marked with `u`), and the list screen already shows ↑ for
  // anything outdated. Repeating it in the plan is the same noise the user asked to remove.
  const catalog = [
    entry({
      categories: ["communication"],
      kind: "install",
      id: "signal",
      meta: { kind: "install", name: "Signal", description: "d" },
    }),
  ];
  const out = renderPlan({
    actions: [],
    skipped: [{ key: "signal", reason: "update-available" }],
  }, catalog);
  assertEquals(out.includes("Signal"), false);
  assertEquals(out.includes("update"), false);
  assertStringIncludes(out, "Nothing to do");
});
