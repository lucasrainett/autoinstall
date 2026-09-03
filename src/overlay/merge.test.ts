import { assertEquals } from "@std/assert";
import { mergeCatalogs, mergeProfiles } from "./merge.ts";
import { validateCatalog } from "../catalog/validator.ts";
import type { CatalogEntry } from "../catalog/types.ts";
import type { OverlayEntry } from "./scan.ts";
import type { Profile } from "../profiles/types.ts";

function coreEntry(
  overrides: Partial<CatalogEntry> & Pick<CatalogEntry, "category" | "kind" | "id">,
): CatalogEntry {
  const path = `/core/catalog/${overrides.category}/${overrides.kind}/${overrides.id}`;
  return {
    meta: { name: overrides.id, description: "core entry", website: "https://example.com" },
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

Deno.test("mergeCatalogs - an overlay providing a full platform override replaces the whole platform, not merged with core's", () => {
  const core = [coreEntry({ category: "games", kind: "install", id: "steam" })];
  const overlay: OverlayEntry = {
    category: "games",
    kind: "install",
    id: "steam",
    platforms: {
      linux: {
        detect: "/overlay/detect.sh",
        install: "/overlay/install.sh",
        remove: "/overlay/remove.sh",
      },
    },
  };
  const { entries, errors } = mergeCatalogs(core, [[overlay]]);
  assertEquals(errors, []);
  const merged = entries.find((e) => e.id === "steam")!;
  assertEquals(merged.platforms.linux, overlay.platforms.linux); // exactly the overlay's set
  assertEquals(merged.meta, core[0].meta); // overlay provided no meta.toml — inherited independently
});

Deno.test("mergeCatalogs - an overlay providing only one operation for a platform does NOT inherit the core's other operations for it", () => {
  // This is the specific risk whole-platform-folder replacement exists to prevent: if the core
  // later changes how an entry works on a platform (e.g. Steam's Linux install moving from a .deb
  // to a flatpak), an overlay that only overrode install.sh must never end up silently paired with
  // the core's newer detect.sh/remove.sh built for a different install method entirely.
  const core = [coreEntry({ category: "games", kind: "install", id: "steam" })];
  const overlay: OverlayEntry = {
    category: "games",
    kind: "install",
    id: "steam",
    platforms: { linux: { install: "/overlay/install.sh" } }, // no detect.sh, no remove.sh
  };
  const { entries } = mergeCatalogs(core, [[overlay]]);
  const merged = entries.find((e) => e.id === "steam")!;
  assertEquals(merged.platforms.linux, { install: "/overlay/install.sh" });
  assertEquals("detect" in merged.platforms.linux!, false); // NOT silently inherited from core
  assertEquals("remove" in merged.platforms.linux!, false);
});

Deno.test("mergeCatalogs - a platform the overlay doesn't mention is fully inherited from the core entry, untouched", () => {
  const core = [coreEntry({
    category: "games",
    kind: "install",
    id: "steam",
    platforms: {
      linux: { detect: "/core/linux/detect.sh", install: "/core/linux/install.sh" },
      macos: { detect: "/core/macos/detect.sh", install: "/core/macos/install.sh" },
    },
  })];
  const overlay: OverlayEntry = {
    category: "games",
    kind: "install",
    id: "steam",
    platforms: { linux: { detect: "/overlay/detect.sh", install: "/overlay/install.sh" } },
  };
  const { entries } = mergeCatalogs(core, [[overlay]]);
  const merged = entries.find((e) => e.id === "steam")!;
  assertEquals(merged.platforms.linux, overlay.platforms.linux); // overridden
  assertEquals(merged.platforms.macos, core[0].platforms.macos); // untouched, still core's
});

Deno.test("mergeCatalogs - an overlay providing its own meta.toml replaces the core entry's meta wholesale", () => {
  const core = [coreEntry({ category: "games", kind: "install", id: "steam" })];
  const overlay: OverlayEntry = {
    category: "games",
    kind: "install",
    id: "steam",
    meta: {
      name: "Steam (custom)",
      description: "renamed by me",
      website: "https://store.steampowered.com",
    },
    platforms: {},
  };
  const { entries } = mergeCatalogs(core, [[overlay]]);
  const merged = entries.find((e) => e.id === "steam")!;
  assertEquals(merged.meta.name, "Steam (custom)");
  // platforms still fully inherited since the overlay provided none
  assertEquals(merged.platforms.linux!.install, core[0].platforms.linux!.install);
});

Deno.test("mergeCatalogs - a new id with its own meta and platforms is purely additive", () => {
  const core = [coreEntry({ category: "games", kind: "install", id: "steam" })];
  const overlay: OverlayEntry = {
    category: "tools",
    kind: "install",
    id: "my-tool",
    meta: { name: "My Tool", description: "x", website: "https://example.com" },
    platforms: { linux: { detect: "/overlay/detect.sh", install: "/overlay/install.sh" } },
  };
  const { entries, errors } = mergeCatalogs(core, [[overlay]]);
  assertEquals(errors, []);
  assertEquals(entries.length, 2);
  assertEquals(entries.some((e) => e.id === "my-tool"), true);
  assertEquals(entries.some((e) => e.id === "steam"), true); // untouched
});

Deno.test("mergeCatalogs - a new id with no meta.toml is an error, not silently added", () => {
  const overlay: OverlayEntry = {
    category: "tools",
    kind: "install",
    id: "my-tool",
    platforms: { linux: { install: "/overlay/install.sh" } },
  };
  const { entries, errors } = mergeCatalogs([], [[overlay]]);
  assertEquals(entries, []);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].message.includes("no meta.toml"), true);
});

Deno.test("mergeCatalogs - a new id with meta but zero platform scripts is an error, not silently added", () => {
  const overlay: OverlayEntry = {
    category: "tools",
    kind: "install",
    id: "my-tool",
    meta: { name: "My Tool", description: "x", website: "https://example.com" },
    platforms: {},
  };
  const { entries, errors } = mergeCatalogs([], [[overlay]]);
  assertEquals(entries, []);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].message.includes("no platform scripts"), true);
});

Deno.test("mergeCatalogs - multiple overlays apply in configured order, later wins over earlier", () => {
  const core = [coreEntry({ category: "games", kind: "install", id: "steam" })];
  const firstOverlay: OverlayEntry = {
    category: "games",
    kind: "install",
    id: "steam",
    platforms: { linux: { install: "/first-overlay/install.sh" } },
  };
  const secondOverlay: OverlayEntry = {
    category: "games",
    kind: "install",
    id: "steam",
    platforms: { linux: { install: "/second-overlay/install.sh" } },
  };
  const { entries } = mergeCatalogs(core, [[firstOverlay], [secondOverlay]]);
  assertEquals(
    entries.find((e) => e.id === "steam")!.platforms.linux!.install,
    "/second-overlay/install.sh",
  );
});

Deno.test("mergeProfiles - a new profile id is additive", () => {
  const core: Profile[] = [{ id: "developer", name: "Developer", description: "x", entryKeys: [] }];
  const overlay: Profile[] = [{
    id: "my-setup",
    name: "My Setup",
    description: "x",
    entryKeys: [],
  }];
  const merged = mergeProfiles(core, [overlay]);
  assertEquals(merged.map((p) => p.id).sort(), ["developer", "my-setup"]);
});

Deno.test("mergeProfiles - an overlay profile sharing a built-in filename replaces it wholesale, not merged", () => {
  const core: Profile[] = [{
    id: "developer",
    name: "Developer",
    description: "built-in",
    entryKeys: ["dev-tools/install/git"],
  }];
  const overlay: Profile[] = [{
    id: "developer",
    name: "Developer (mine)",
    description: "customized",
    entryKeys: ["dev-tools/install/rust"], // entirely different list, not merged with core's
  }];
  const merged = mergeProfiles(core, [overlay]);
  assertEquals(merged.length, 1);
  assertEquals(merged[0].entryKeys, ["dev-tools/install/rust"]);
});

Deno.test("mergeProfiles - multiple overlays apply in configured order, later wins", () => {
  const overlayA: Profile[] = [{ id: "developer", name: "A", description: "x", entryKeys: [] }];
  const overlayB: Profile[] = [{ id: "developer", name: "B", description: "x", entryKeys: [] }];
  const merged = mergeProfiles([], [overlayA, overlayB]);
  assertEquals(merged[0].name, "B");
});

Deno.test("mergeCatalogs + validateCatalog - an incomplete platform override is caught as invalid, not silently accepted", () => {
  // The actual end-to-end safety claim: no special-case validation lives in merge.ts itself —
  // running the merged result through the same validator every catalog goes through is enough,
  // because whole-platform-folder replacement means an incomplete override really does produce
  // an incomplete platform (see the test above), which validateCatalog already rejects.
  const core = [coreEntry({ category: "games", kind: "install", id: "steam" })];
  const overlay: OverlayEntry = {
    category: "games",
    kind: "install",
    id: "steam",
    platforms: { linux: { install: "/overlay/install.sh" } }, // missing detect.sh
  };
  const { entries } = mergeCatalogs(core, [[overlay]]);
  const issues = validateCatalog(entries);
  assertEquals(issues.some((i) => i.message.includes("missing detect.sh")), true);
});
