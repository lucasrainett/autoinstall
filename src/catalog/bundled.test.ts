// Loads and validates the *real* bundled catalog (repo root /catalog), not a fixture.
// This is the same check Phase 9's "catalog schema validation on every PR" CI task will run —
// having it as a test now means a broken real entry fails `deno task test` immediately.

import { assert, assertEquals } from "@std/assert";
import { loadCatalog } from "./loader.ts";
import { entryKey } from "./types.ts";
import { validateCatalog } from "./validator.ts";
import { fromFileUrl } from "@std/path";

const BUNDLED_CATALOG_ROOT = fromFileUrl(new URL("../../catalog", import.meta.url));

/** Reads every Linux operation script of every entry that installs via AppImage. */
async function linuxAppImageScripts(): Promise<{ path: string; source: string }[]> {
  const { entries } = await loadCatalog(BUNDLED_CATALOG_ROOT);
  const scripts: { path: string; source: string }[] = [];
  for (const entry of entries) {
    if (entry.meta.platforms?.linux?.installMethod !== "appimage") continue;
    const linux = entry.platforms.linux;
    if (linux === undefined) continue;
    for (const path of Object.values(linux)) {
      scripts.push({ path, source: await Deno.readTextFile(path) });
    }
  }
  return scripts;
}

Deno.test("bundled catalog - loads with zero load errors", async () => {
  const { errors } = await loadCatalog(BUNDLED_CATALOG_ROOT);
  assertEquals(errors, []);
});

Deno.test("bundled catalog - passes validation with zero issues", async () => {
  const { entries } = await loadCatalog(BUNDLED_CATALOG_ROOT);
  const issues = validateCatalog(entries);
  assertEquals(issues, []);
});

// Standing convention, set by the user: every AppImage entry goes through Gear Lever
// (it.mijorus.gearlever) — it owns the desktop integration (launcher entry, icon) and update
// tracking, so entries never hand-roll .desktop/icon files or drop a loose executable with no way
// to launch it. Enforced here rather than left as a note, because the last time an entry managed
// AppImage paths itself it silently installed duplicates alongside Gear Lever's own copies.
Deno.test("bundled catalog - every AppImage entry manages its AppImage through Gear Lever", async () => {
  const scripts = await linuxAppImageScripts();
  assert(scripts.length > 0, "expected at least one AppImage entry to check");

  const offenders = scripts
    .filter((s) => !s.source.includes("it.mijorus.gearlever"))
    .map((s) => s.path);
  assertEquals(
    offenders,
    [],
    `AppImage scripts must go through Gear Lever: ${offenders.join(", ")}`,
  );
});

Deno.test("bundled catalog - no AppImage entry hardcodes an AppImage path, since Gear Lever's folder is user-configurable", async () => {
  // A hardcoded path is what caused real duplicate installs: Gear Lever normalizes filenames to
  // lowercase and stores them wherever the user configured, so probing e.g. ~/AppImages/X.AppImage
  // reports "not installed" on a machine that already has it and then installs a second copy.
  const offenders = (await linuxAppImageScripts())
    .filter((s) => /\$HOME\/AppImages|~\/AppImages/.test(s.source))
    .map((s) => s.path);
  assertEquals(
    offenders,
    [],
    `must query Gear Lever instead of a fixed path: ${offenders.join(", ")}`,
  );
});

// The update capability was silently dead for the entire project: no detect.sh ever returned 2
// (needs-update), so computePlan could never emit an update action and nothing could be brought
// up to date. Nothing caught it because every module involved was individually correct. These
// tests pin the catalog-content side of that contract.
Deno.test("bundled catalog - package-manager entries can report needs-update (exit 2)", async () => {
  const { entries } = await loadCatalog(BUNDLED_CATALOG_ROOT);
  const METHODS_WITH_UPDATE_CHECKS = new Set([
    "apt",
    "deb",
    "flatpak",
    "homebrew",
    "winget",
    "appimage",
  ]);

  const missing: string[] = [];
  for (const entry of entries) {
    // Only install-kind entries can meaningfully be "out of date". For a cleanup entry the
    // desired state is *absence*, so there is no newer version to offer; and a configure entry's
    // drift is a settings question, not a package-version one.
    if (entry.kind !== "install") continue;
    for (const platform of ["linux", "macos", "windows"] as const) {
      const ops = entry.platforms[platform];
      if (ops?.detect === undefined) continue;
      const method = entry.meta.platforms?.[platform]?.installMethod;
      if (method === undefined || !METHODS_WITH_UPDATE_CHECKS.has(method)) continue;
      const source = await Deno.readTextFile(ops.detect);
      if (!source.includes("exit 2")) missing.push(`${entry.id}/${platform} (${method})`);
    }
  }
  assertEquals(
    missing,
    [],
    `these detect scripts can never report an available update: ${missing.join(", ")}`,
  );
});

Deno.test("bundled catalog - every detect script documents the exit-code contract it implements", async () => {
  const { entries } = await loadCatalog(BUNDLED_CATALOG_ROOT);
  const undocumented: string[] = [];
  for (const entry of entries) {
    for (const platform of ["linux", "macos", "windows"] as const) {
      const detect = entry.platforms[platform]?.detect;
      if (detect === undefined) continue;
      const source = await Deno.readTextFile(detect);
      if (!/Exit 0/i.test(source)) undocumented.push(`${entry.id}/${platform}`);
    }
  }
  assertEquals(
    undocumented,
    [],
    `detect scripts missing their exit-code comment: ${undocumented.join(", ")}`,
  );
});

Deno.test("bundled catalog - no detect script requires sudo, because the startup scan runs unelevated", async () => {
  // The diagnostic scan runs every detect script before any elevation is requested. A detect that
  // shells out to sudo therefore fails for want of a cached credential and reports an applied
  // entry as *not* applied — the tool then offers to redo work already done. Caught for real on
  // the firewall entry, whose first version ran `sudo -n ufw status` and reported an enabled
  // firewall as disabled; it reads ufw's world-readable config instead now.
  const { entries } = await loadCatalog(BUNDLED_CATALOG_ROOT);
  const offenders: string[] = [];
  for (const entry of entries) {
    for (const platform of ["linux", "macos", "windows"] as const) {
      const detect = entry.platforms[platform]?.detect;
      if (detect === undefined) continue;
      const source = await Deno.readTextFile(detect);
      const usesSudo = source
        .split("\n")
        .filter((line) => !line.trim().startsWith("#"))
        .some((line) => /(^|[^\w-])sudo\s/.test(line));
      if (usesSudo) offenders.push(`${entry.id}/${platform}`);
    }
  }
  assertEquals(offenders, [], `detect scripts must not need elevation: ${offenders.join(", ")}`);
});

Deno.test("bundled catalog - the duplicated apt collateral guard has not drifted between entries", async () => {
  // This block is deliberately copy-pasted into every apt-based remove.sh rather than factored
  // into a shared helper. Sourcing a shared file would break the property that each operation is
  // runnable standalone (copy one script to a machine and run it), and would couple an overlay
  // repo's overridden script to the core catalog's internal layout. Several of these scripts also
  // legitimately differ around the guard — six add repo/keyring cleanup — so a shared helper
  // would accumulate flags to absorb that divergence.
  //
  // What duplication genuinely costs is silent drift: a fix applied to one copy and not the rest.
  // This test buys back exactly that, without giving up any of the properties above.
  const removeScripts: { path: string; guard: string }[] = [];
  for await (const entry of Deno.readDir(BUNDLED_CATALOG_ROOT)) {
    if (!entry.isDirectory) continue;
    for await (const kind of Deno.readDir(`${BUNDLED_CATALOG_ROOT}/${entry.name}`)) {
      for await (const id of Deno.readDir(`${BUNDLED_CATALOG_ROOT}/${entry.name}/${kind.name}`)) {
        const path =
          `${BUNDLED_CATALOG_ROOT}/${entry.name}/${kind.name}/${id.name}/linux/remove.sh`;
        let source: string;
        try {
          source = await Deno.readTextFile(path);
        } catch {
          continue;
        }
        if (!source.includes("COLLATERAL=")) continue;
        // Anchored on the assignment rather than a comment: the two guard variants carry
        // different prose, and anchoring on one variant's comment silently mis-extracted the
        // other (every script then looked like the same empty slice).
        const start = source.indexOf("COLLATERAL=");
        const end = source.indexOf("\nfi\n", start);
        assert(start >= 0 && end > start, `could not extract the guard from ${path}`);
        removeScripts.push({ path, guard: source.slice(start, end) });
      }
    }
  }

  assert(removeScripts.length > 1, "expected several entries to carry the shared guard");

  // Two variants exist deliberately, and they are not interchangeable:
  //   - the plain guard, where *any* collateral aborts the removal;
  //   - the family-prefix guard used by preinstalled-app entries, where the app's own
  //     subpackages are the thing being removed and so are expected, while anything outside
  //     that family still aborts.
  // Each variant must be internally identical; drift within a variant is the bug this catches.
  for (const variant of ["plain", "family"] as const) {
    const group = removeScripts.filter((r) =>
      variant === "family"
        ? r.guard.includes("EXPECTED_PREFIX")
        : !r.guard.includes("EXPECTED_PREFIX")
    );
    if (group.length === 0) continue;
    const distinct = new Set(group.map((r) => r.guard));
    assertEquals(
      distinct.size,
      1,
      `the ${variant} collateral guard has drifted across ${group.length} scripts; apply the fix to all of them`,
    );
  }
});

Deno.test("bundled catalog - the real Signal entry loads with the expected shape", async () => {
  const { entries } = await loadCatalog(BUNDLED_CATALOG_ROOT);
  const signal = entries.find((e) => e.id === "signal");

  assert(signal, "expected a real signal entry in the bundled catalog");
  assertEquals(signal.category, "communication");
  assertEquals(signal.kind, "install");
  assertEquals(signal.meta.website, "https://signal.org");
  // Linux lives in the packaging-specific siblings, so the base entry covers only the platforms
  // where there is exactly one way to install it.
  assertEquals(Object.keys(signal.platforms).sort(), ["macos", "windows"]);
  for (const platform of ["macos", "windows"] as const) {
    assertEquals(Object.keys(signal.platforms[platform]!).sort(), ["detect", "install", "remove"]);
  }
});

Deno.test("bundled catalog - software with two Linux packagings is split into separate entries", async () => {
  // Requested by the user: "for things like steam, we should show steam-flatpak and steam-deb in
  // the list, so the user can install/remove it". A single entry cannot express "remove the
  // Flatpak but keep the deb", which is a real state — that machine had both VSCodium and Signal
  // installed twice over.
  const { entries } = await loadCatalog(BUNDLED_CATALOG_ROOT);
  const byId = new Map(entries.map((e) => [e.id, e]));

  for (const base of ["steam", "vscodium", "signal"]) {
    for (const suffix of ["deb", "flatpak"]) {
      const variant = byId.get(`${base}-${suffix}`);
      assert(variant, `expected a ${base}-${suffix} entry`);
      // Each variant is Linux-only: the packaging split does not exist on macOS or Windows.
      assertEquals(
        Object.keys(variant.platforms).sort(),
        ["linux"],
        `${base}-${suffix} should be Linux-only`,
      );
      assert(
        variant.meta.name.includes("(") && variant.meta.name.includes(")"),
        `${base}-${suffix} must name its packaging in the display name, or the two are indistinguishable in the list`,
      );
    }
    // The base entry keeps the platforms that have only one packaging, and must not also offer
    // Linux — that would put the same software in the list twice over on Linux.
    const baseEntry = byId.get(base);
    assert(baseEntry, `expected the base ${base} entry to remain for macOS/Windows`);
    assertEquals(baseEntry.platforms.linux, undefined, `${base} must not also apply to Linux`);
  }
});

Deno.test("bundled catalog - every collateral guard declines with exit 3, not a bare success", async () => {
  // The engine verifies each action by re-running detect.sh afterwards. A guard that exited 0
  // while deliberately leaving the package installed would make that check report a correct,
  // protective decision as a failure — so "declined" needs its own exit code, uniformly.
  let checked = 0;
  for await (const category of Deno.readDir(BUNDLED_CATALOG_ROOT)) {
    if (!category.isDirectory) continue;
    for await (const kind of Deno.readDir(`${BUNDLED_CATALOG_ROOT}/${category.name}`)) {
      for await (
        const id of Deno.readDir(`${BUNDLED_CATALOG_ROOT}/${category.name}/${kind.name}`)
      ) {
        const path =
          `${BUNDLED_CATALOG_ROOT}/${category.name}/${kind.name}/${id.name}/linux/remove.sh`;
        let source: string;
        try {
          source = await Deno.readTextFile(path);
        } catch {
          continue;
        }
        if (!source.includes("COLLATERAL=")) continue;
        checked++;
        // Anchored *from* the guard, not from the start of the file: a script with any earlier
        // `fi` (Steam checks for a flatpak first) otherwise produced an end index before the
        // start, an empty slice, and a false failure.
        const guardStart = source.indexOf("COLLATERAL=");
        const guard = source.slice(guardStart, source.indexOf("\nfi\n", guardStart));
        assert(
          guard.includes("exit 3"),
          `${path} declines a removal without exiting 3, so it would be verified as a failure`,
        );
        assert(
          !guard.includes("\n  exit 0\n"),
          `${path} still exits 0 from inside the guard`,
        );
      }
    }
  }
  assert(checked > 0, "found no collateral guards to check — the test is not looking anywhere");
});

Deno.test("bundled catalog - every platform folder ships a remove.sh", async () => {
  // The list no longer draws a ✓ for "installed", because that is derivable: an unchecked entry
  // that is installed always shows as a pending removal (bold). That derivation only holds while
  // every entry actually *has* a removal — without one, `computePlan` skips it, nothing goes bold,
  // and an installed entry would look identical to an absent one. The validator only requires one
  // of install/remove/update, so this pins the stronger rule for the bundled catalog.
  const missing: string[] = [];
  for await (const category of Deno.readDir(BUNDLED_CATALOG_ROOT)) {
    if (!category.isDirectory) continue;
    for await (const kind of Deno.readDir(`${BUNDLED_CATALOG_ROOT}/${category.name}`)) {
      for await (
        const id of Deno.readDir(`${BUNDLED_CATALOG_ROOT}/${category.name}/${kind.name}`)
      ) {
        const entryDir = `${BUNDLED_CATALOG_ROOT}/${category.name}/${kind.name}/${id.name}`;
        for await (const platform of Deno.readDir(entryDir)) {
          if (!platform.isDirectory) continue;
          try {
            await Deno.stat(`${entryDir}/${platform.name}/remove.sh`);
          } catch {
            missing.push(`${category.name}/${kind.name}/${id.name}/${platform.name}`);
          }
        }
      }
    }
  }
  assertEquals(missing, [], "these platform folders have no remove.sh");
});

Deno.test("bundled catalog - every flatpak command names its installation", async () => {
  // Flathub is routinely configured in more than one installation at once — Zorin OS ships a
  // system flathub alongside the per-user one — and an unscoped flatpak command then fails with
  // "No remote chosen to resolve matches for <app>" under --noninteractive. On a real machine that
  // one omission caused 18 of 22 recorded failures: every flatpak entry in the catalog.
  const offenders: string[] = [];
  for await (const category of Deno.readDir(BUNDLED_CATALOG_ROOT)) {
    if (!category.isDirectory) continue;
    for await (const kind of Deno.readDir(`${BUNDLED_CATALOG_ROOT}/${category.name}`)) {
      for await (
        const id of Deno.readDir(`${BUNDLED_CATALOG_ROOT}/${category.name}/${kind.name}`)
      ) {
        const dir = `${BUNDLED_CATALOG_ROOT}/${category.name}/${kind.name}/${id.name}/linux`;
        for (const op of ["detect", "install", "remove"]) {
          let source: string;
          try {
            source = await Deno.readTextFile(`${dir}/${op}.sh`);
          } catch {
            continue;
          }
          for (const line of source.split("\n")) {
            const text = line.trim();
            if (text.startsWith("#")) continue;
            // The subcommands that resolve against a remote or an installation.
            if (!/^flatpak (install|uninstall|remote-info|update)\b/.test(text)) continue;
            if (!/--user|--system|"\$scope"/.test(text)) {
              offenders.push(`${category.name}/${kind.name}/${id.name}/${op}.sh: ${text}`);
            }
          }
        }
      }
    }
  }
  assertEquals(offenders, [], "these flatpak commands would be ambiguous on a real machine");
});

Deno.test("bundled catalog - entries that edit a shared file write a delimited, self-contained block", async () => {
  // /etc/hosts belongs to the user, not to this tool: other software writes there, and so do they.
  // Every entry that touches it must add one delimited block and remove exactly that, so an
  // apply/revert cycle is byte-exact and nobody else's lines are disturbed. A separator written
  // *outside* the block is the specific mistake this guards — it survives removal and the file
  // grows by a line on every cycle.
  const editors: string[] = [];
  for await (const category of Deno.readDir(BUNDLED_CATALOG_ROOT)) {
    if (!category.isDirectory) continue;
    for await (const kind of Deno.readDir(`${BUNDLED_CATALOG_ROOT}/${category.name}`)) {
      for await (
        const id of Deno.readDir(`${BUNDLED_CATALOG_ROOT}/${category.name}/${kind.name}`)
      ) {
        const dir = `${BUNDLED_CATALOG_ROOT}/${category.name}/${kind.name}/${id.name}`;
        for (const platform of ["linux", "macos"]) {
          let install: string, remove: string;
          try {
            install = await Deno.readTextFile(`${dir}/${platform}/install.sh`);
            remove = await Deno.readTextFile(`${dir}/${platform}/remove.sh`);
          } catch {
            continue;
          }
          if (!install.includes("/etc/hosts")) continue;
          const where = `${category.name}/${kind.name}/${id.name}/${platform}`;
          editors.push(where);

          assert(
            install.includes('MARKER="# autoinstall:'),
            `${where}: must delimit its block with an autoinstall marker`,
          );
          assert(
            !/printf '\\n%s\\n' "\$MARKER"/.test(install),
            `${where}: writes a separator before the marker, which survives removal`,
          );
          assert(
            remove.includes("MARKER") && remove.includes("/etc/hosts"),
            `${where}: removal must strip its own marked block from /etc/hosts`,
          );
        }
      }
    }
  }
  assert(editors.length > 0, "found no hosts-editing entries — the test is not looking anywhere");
});

Deno.test("bundled catalog - every entry declares at least one capability", async () => {
  // Capabilities are what make "is this available on the other platforms?" a query instead of a
  // judgement call — see src/catalog/capabilities.ts for the wrong answers that produced. An
  // untagged entry is invisible to that query, so it silently stops working as coverage grows.
  const { entries } = await loadCatalog(BUNDLED_CATALOG_ROOT);
  const untagged = entries
    .filter((e) => (e.meta.capabilities ?? []).length === 0)
    .map((e) => entryKey(e));
  assertEquals(untagged, [], "these entries declare no capabilities");
});

Deno.test("bundled catalog - no entry claims the same capability twice", async () => {
  const { entries } = await loadCatalog(BUNDLED_CATALOG_ROOT);
  for (const entry of entries) {
    const caps = entry.meta.capabilities ?? [];
    assertEquals(
      new Set(caps).size,
      caps.length,
      `${entryKey(entry)} repeats a capability: ${caps.join(", ")}`,
    );
  }
});

Deno.test({
  name: "bundled catalog - every script is executable",
  // NTFS has no POSIX executable bit. Deno.stat().mode on Windows does not return null as this
  // test originally assumed — it reports a synthesised mode with no exec bits set, so the check
  // failed for all 170 entries at once. The property is real but only meaningful where the
  // filesystem records it, and .gitattributes plus the Linux/macOS runs keep it honest.
  ignore: Deno.build.os === "windows",
  fn: async () => {
    // The engine runs scripts as `bash <path>`, so this is not what makes them work. It matters
    // because the whole design rests on any single operation being runnable by hand — that is how
    // most bugs in this project were actually diagnosed — and `./detect.sh` failing with "permission
    // denied" is a pointless obstacle at exactly that moment. Mixed modes also make every checkout
    // show spurious diffs.
    const notExecutable: string[] = [];
    for await (const category of Deno.readDir(BUNDLED_CATALOG_ROOT)) {
      if (!category.isDirectory) continue;
      for await (const kind of Deno.readDir(`${BUNDLED_CATALOG_ROOT}/${category.name}`)) {
        for await (
          const id of Deno.readDir(`${BUNDLED_CATALOG_ROOT}/${category.name}/${kind.name}`)
        ) {
          const entryDir = `${BUNDLED_CATALOG_ROOT}/${category.name}/${kind.name}/${id.name}`;
          for await (const platform of Deno.readDir(entryDir)) {
            if (!platform.isDirectory) continue;
            for await (const file of Deno.readDir(`${entryDir}/${platform.name}`)) {
              if (!file.name.endsWith(".sh")) continue;
              const path = `${entryDir}/${platform.name}/${file.name}`;
              const mode = (await Deno.stat(path)).mode;
              // Windows reports a null mode; there is nothing to check there.
              if (mode !== null && (mode & 0o111) === 0) {
                notExecutable.push(path.replace(BUNDLED_CATALOG_ROOT, "catalog"));
              }
            }
          }
        }
      }
    }
    assertEquals(notExecutable, [], "these catalog scripts are not executable");
  },
});
