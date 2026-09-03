import { assert, assertEquals } from "@std/assert";
import { validateCatalog } from "./validator.ts";
import type { CatalogEntry } from "./types.ts";

function entry(
  overrides: Partial<CatalogEntry> & Pick<CatalogEntry, "category" | "kind" | "id">,
): CatalogEntry {
  return {
    meta: { name: overrides.id, description: "test entry" },
    path: `/catalog/${overrides.category}/${overrides.kind}/${overrides.id}`,
    platforms: { linux: { detect: "detect.sh", install: "install.sh" } },
    ...overrides,
  };
}

Deno.test("validateCatalog - a well-formed catalog produces zero issues", () => {
  const issues = validateCatalog([
    entry({ category: "communication", kind: "install", id: "signal" }),
    entry({ category: "privacy", kind: "configure", id: "disable-telemetry" }),
  ]);
  assertEquals(issues, []);
});

Deno.test("validateCatalog - flags a duplicate category/kind/id across two entries", () => {
  const first = entry({
    category: "communication",
    kind: "install",
    id: "signal",
    path: "/core/signal",
  });
  const duplicate = entry({
    category: "communication",
    kind: "install",
    id: "signal",
    path: "/overlay/signal",
  });

  const issues = validateCatalog([first, duplicate]);
  assertEquals(issues.length, 1);
  assert(issues[0].path === "/overlay/signal");
  assert(issues[0].message.includes("duplicate"));
  assert(issues[0].message.includes("/core/signal"));
});

Deno.test("validateCatalog - flags a platform folder missing detect.sh", () => {
  const withoutDetect = entry({
    category: "communication",
    kind: "install",
    id: "signal",
    platforms: { linux: { install: "install.sh", remove: "remove.sh" } },
  });

  const issues = validateCatalog([withoutDetect]);
  assert(issues.some((i) => i.message.includes("missing detect.sh")));
});

Deno.test("validateCatalog - flags a platform folder that has only detect.sh and nothing else", () => {
  const detectOnly = entry({
    category: "communication",
    kind: "install",
    id: "signal",
    platforms: { linux: { detect: "detect.sh" } },
  });

  const issues = validateCatalog([detectOnly]);
  assert(issues.some((i) => i.message.includes("no operation besides detect.sh")));
});

Deno.test("validateCatalog - a good known-good fixture passes with zero findings", () => {
  const issues = validateCatalog([
    entry({
      category: "communication",
      kind: "install",
      id: "signal",
      platforms: {
        linux: { detect: "detect.sh", install: "install.sh", remove: "remove.sh" },
        macos: { detect: "detect.sh", install: "install.sh" },
      },
    }),
  ]);
  assertEquals(issues, []);
});
