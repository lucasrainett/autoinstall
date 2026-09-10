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

/** Every entry directory. The catalog is flat — one directory per entry, named by its id. */
async function entryDirs(): Promise<string[]> {
  const dirs: string[] = [];
  for await (const e of Deno.readDir(BUNDLED_CATALOG_ROOT)) {
    if (e.isDirectory) dirs.push(`${BUNDLED_CATALOG_ROOT}/${e.name}`);
  }
  return dirs.sort();
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
  for (const entryDir of await entryDirs()) {
    {
      {
        const path = `${entryDir}/linux/remove.sh`;
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
  // Categories are derived from capabilities now, so this asserts the derivation rather than a
  // declared field: Signal provides messaging and video calls, both of which are communication.
  // Two categories, both derived: messaging and video-calls are communication, and end-to-end
  // encryption — which is the reason most people choose Signal — is security.
  assertEquals(signal.categories, ["communication", "security"]);
  assertEquals(signal.kind, "install");
  assertEquals(signal.meta.website, "https://signal.org");
  // Linux lives in the packaging-specific siblings, so the base entry covers only the platforms
  // where there is exactly one way to install it.
  assertEquals(Object.keys(signal.platforms).sort(), ["macos", "windows"]);
  for (const platform of ["macos", "windows"] as const) {
    // run.sh is present too: Signal is a GUI app, so it can be started from the tool.
    assertEquals(
      Object.keys(signal.platforms[platform]!).sort(),
      ["detect", "install", "remove", "run"],
    );
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
  for (const entryDir of await entryDirs()) {
    {
      {
        const path = `${entryDir}/linux/remove.sh`;
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
  for (const entryDir of await entryDirs()) {
    {
      {
        for await (const platform of Deno.readDir(entryDir)) {
          if (!platform.isDirectory) continue;
          try {
            await Deno.stat(`${entryDir}/${platform.name}/remove.sh`);
          } catch {
            missing.push(`${entryDir}/${platform.name}`);
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
  for (const entryDir of await entryDirs()) {
    {
      {
        const dir = `${BUNDLED_CATALOG_ROOT}/${entryDir}/linux`;
        // run.sh is deliberately excluded. Naming an installation is right for install and
        // remove, where putting software in the wrong one is a real mistake — but `flatpak run`
        // should find the app wherever it lives. Scoping it to --user broke launching for every
        // system-installed app: 83 of the 95 flatpaks on the machine where this was found.
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
              offenders.push(`${entryDir}/${op}.sh: ${text}`);
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
  for (const entryDir of await entryDirs()) {
    {
      {
        const dir = entryDir;
        for (const platform of ["linux", "macos"]) {
          let install: string, remove: string;
          try {
            install = await Deno.readTextFile(`${dir}/${platform}/install.sh`);
            remove = await Deno.readTextFile(`${dir}/${platform}/remove.sh`);
          } catch {
            continue;
          }
          if (!install.includes("/etc/hosts")) continue;
          const where = `${entryDir}/${platform}`;
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
    for (const entryDir of await entryDirs()) {
      {
        {
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

Deno.test("bundled catalog - no run.sh scopes flatpak to one installation", async () => {
  // The opposite rule to install/remove, and it matters: `flatpak run --user` fails outright for a
  // system-installed app. Reported by the user as the app simply not opening.
  const offenders: string[] = [];
  for (const entryDir of await entryDirs()) {
    for (const platform of ["linux", "macos", "windows"]) {
      let source: string;
      try {
        source = await Deno.readTextFile(`${entryDir}/${platform}/run.sh`);
      } catch {
        continue;
      }
      if (/flatpak run[^\n]*--(user|system)\b/.test(source)) {
        offenders.push(`${entryDir}/${platform}/run.sh`);
      }
    }
  }
  assertEquals(
    offenders,
    [],
    "a scoped `flatpak run` cannot find an app in the other installation",
  );
});

Deno.test("bundled catalog - no meta.toml declares the same key twice", async () => {
  // @std/toml accepts a duplicate key and silently keeps the last one, so an edit that adds a
  // second `notes =` to a table discards the original with no error anywhere. Hit while editing
  // the Docker entry by hand; nothing in the load, the schema or the tests noticed.
  const offenders: string[] = [];
  for (const entryDir of await entryDirs()) {
    const source = await Deno.readTextFile(`${entryDir}/meta.toml`);
    let table = "";
    const seen = new Set<string>();
    let inMultiline = false;
    for (const raw of source.split("\n")) {
      const line = raw.trim();
      // Skip over """ blocks, whose contents can look like anything.
      const fences = (line.match(/"""/g) ?? []).length;
      if (inMultiline) {
        if (fences % 2 === 1) inMultiline = false;
        continue;
      }
      if (line.startsWith("[")) {
        table = line;
        seen.clear();
        continue;
      }
      const key = /^([A-Za-z_][A-Za-z0-9_-]*)\s*=/.exec(line)?.[1];
      if (key === undefined) continue;
      if (fences % 2 === 1) inMultiline = true;
      if (seen.has(key)) offenders.push(`${entryDir}: ${table || "(top level)"} ${key}`);
      seen.add(key);
    }
  }
  assertEquals(offenders, [], "duplicate keys silently discard the earlier value");
});

Deno.test("bundled catalog - an update script updates the app its own entry installs", async () => {
  // Generated update scripts were derived from each install script's flatpak id — which for an
  // AppImage entry is Gear Lever, the *tool*, not the software. Five entries ended up with an
  // update that would have updated Gear Lever and reported success while changing nothing
  // relevant. Caught by comparing the two ids rather than trusting the generator.
  const mismatched: string[] = [];
  for (const entryDir of await entryDirs()) {
    let update: string, install: string;
    try {
      update = await Deno.readTextFile(`${entryDir}/linux/update.sh`);
      install = await Deno.readTextFile(`${entryDir}/linux/install.sh`);
    } catch {
      continue;
    }
    const updates = /flatpak update "\$scope" ([A-Za-z0-9_.-]+)/.exec(update)?.[1];
    const installs = /flatpak install[^\n]*?\bflathub\s+([A-Za-z0-9_][A-Za-z0-9_.-]+)/.exec(install)
      ?.[1];
    if (updates !== undefined && installs !== undefined && updates !== installs) {
      mismatched.push(`${entryDir}: updates ${updates}, installs ${installs}`);
    }
  }
  assertEquals(mismatched, [], "an update script targeting a different app than its install");
});

Deno.test("bundled catalog - flatpak update and uninstall cover every installation", async () => {
  // An app can be installed system-wide and per-user at once. `if/elif` removed the user copy and
  // left the system one, after which detect correctly reported the entry as still present and the
  // removal was recorded as a failure. Reported for real: 90 of that machine's 100 flatpaks were
  // system-wide.
  const offenders: string[] = [];
  for (const entryDir of await entryDirs()) {
    for (const op of ["update", "remove"]) {
      let source: string;
      try {
        source = await Deno.readTextFile(`${entryDir}/linux/${op}.sh`);
      } catch {
        continue;
      }
      if (!/flatpak (update|uninstall)/.test(source)) continue;
      // Either it loops over both installations, or it is not scoped at all.
      const loops = /for scope in --user --system/.test(source);
      const elif = /elif flatpak info --system/.test(source);
      if (elif || (!loops && /--user|--system/.test(source))) {
        offenders.push(`${entryDir}/linux/${op}.sh`);
      }
    }
  }
  assertEquals(offenders, [], "these touch only one flatpak installation");
});

Deno.test("bundled catalog - a keyring written with gpg -o also passes --yes", async () => {
  // `gpg --dearmor -o <file>` refuses when the file already exists, and under --batch that is a
  // hard failure rather than a prompt — so the script works once and fails on every re-run. Either
  // write to stdout (what most entries here do) or pass --yes. Caught by the first full lifecycle
  // run, which reported the OpenTofu entry as "not safe to re-run"; Terraform and VSCodium use the
  // same flag correctly, which is what made the difference visible.
  const offenders: string[] = [];
  for (const entryDir of await entryDirs()) {
    for (const platform of ["linux", "macos", "windows"]) {
      for (const op of ["install", "update", "remove"]) {
        let source: string;
        try {
          source = await Deno.readTextFile(`${entryDir}/${platform}/${op}.sh`);
        } catch {
          continue;
        }
        for (const line of source.split("\n")) {
          if (line.trimStart().startsWith("#")) continue;
          if (!/gpg\b[^|>]*--dearmor\b[^|>]*\s-o\s/.test(line)) continue;
          if (!/--yes\b/.test(line)) {
            offenders.push(`${entryDir}/${platform}/${op}.sh`);
          }
        }
      }
    }
  }
  assertEquals(offenders, [], "gpg --dearmor -o without --yes fails on a second run");
});

Deno.test("bundled catalog - a Store-only Windows install declines instead of claiming success", async () => {
  // These open the Microsoft Store and cannot complete unattended. They used to exit 0 having
  // installed nothing, which the verification caught as "detect still reports absent after
  // install" — and on a runner with no Store, Start-Process never returned and four of them hung
  // for the full ten-minute timeout. Exit 3 is "declined, nothing changed".
  const offenders: string[] = [];
  for (const entryDir of await entryDirs()) {
    let source: string;
    try {
      source = await Deno.readTextFile(`${entryDir}/windows/install.sh`);
    } catch {
      continue;
    }
    if (!source.includes("ms-windows-store")) continue;
    if (!/\bexit 3\b/.test(source)) offenders.push(`${entryDir}/windows/install.sh`);
  }
  assertEquals(offenders, [], "a Store-only install that does not decline");
});

Deno.test("bundled catalog - a Windows entry needing elevation checks for it before changing anything", async () => {
  // Without the check these run partway and then stop on the first operation that touches HKLM or
  // a scheduled task, leaving some settings applied and some not. On an unelevated CI runner
  // disable-telemetry failed with "PermissionDenied ... HRESULT 0x80070005" after it had already
  // written several values. Exit 3 — declined, nothing changed — leaves the machine consistent.
  //
  // Windows PowerShell 5.1 is what `powershell.exe` runs, and it has no ternary operator, so the
  // check has to be written as if/else. `? :` there is a parse error, not a false answer, which
  // would make every one of these entries decline unconditionally.
  const { entries } = await loadCatalog(BUNDLED_CATALOG_ROOT);
  const offenders: string[] = [];
  for (const entry of entries) {
    if (entry.meta.platforms?.windows?.requiresElevation !== true) continue;
    const entryDir = `${BUNDLED_CATALOG_ROOT}/${entryKey(entry)}`;
    for (const op of ["install", "remove"]) {
      let source: string;
      try {
        source = await Deno.readTextFile(`${entryDir}/windows/${op}.sh`);
      } catch {
        continue;
      }
      if (!source.includes("WindowsBuiltInRole]::Administrator")) {
        offenders.push(`${entryDir}/windows/${op}.sh: no administrator check`);
      } else if (!/\bexit 3\b/.test(source)) {
        offenders.push(`${entryDir}/windows/${op}.sh: checks for elevation but does not decline`);
      }
      if (/\)\s*\?\s*\d+\s*:\s*\d+/.test(source)) {
        offenders.push(`${entryDir}/windows/${op}.sh: ternary is a parse error in PowerShell 5.1`);
      }
    }
  }
  assertEquals(offenders, [], "a Windows entry that needs elevation but does not check for it");
});

Deno.test("bundled catalog - a PowerShell variable in a Windows script is escaped from bash", async () => {
  // These scripts run under Git Bash and hand PowerShell a bash double-quoted string, so `$v` is
  // expanded by bash — to nothing — before PowerShell ever sees it. A PowerShell variable has to
  // be written `\$v`. Unescaped, the command became " = (Get-ItemProperty ...", a parse error, and
  // PowerShell exited non-zero. In a detect script that reads as exit 1, "not installed": both
  // dark-mode and disable-telemetry applied their setting correctly on every run and could never
  // see it afterwards, which showed up as "detect still reports absent after install".
  //
  // A name the script assigns itself, or a Windows environment variable, is a real bash expansion
  // and is meant to be interpolated — those are not flagged.
  const fromEnvironment = ["LOCALAPPDATA", "APPDATA", "USERPROFILE", "HOME", "PATH", "TEMP", "TMP"];
  const offenders: string[] = [];
  for (const entryDir of await entryDirs()) {
    for (const op of ["detect", "install", "update", "remove", "run"]) {
      const path = `${entryDir}/windows/${op}.sh`;
      let source: string;
      try {
        source = await Deno.readTextFile(path);
      } catch {
        continue;
      }
      if (!source.includes("powershell.exe")) continue;
      const assigned = new Set(
        [...source.matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/gm)].map((m) => m[1]),
      );
      for (const name of fromEnvironment) assigned.add(name);
      source.split("\n").forEach((line, index) => {
        if (line.trimStart().startsWith("#")) return;
        for (const match of line.matchAll(/(?<![\\$])\$(?!\{)([A-Za-z_][A-Za-z0-9_]*)/g)) {
          if (assigned.has(match[1])) continue;
          offenders.push(
            `${path}:${index + 1}: $${match[1]} is eaten by bash — write \\$${match[1]}`,
          );
        }
      });
    }
  }
  assertEquals(offenders, [], "an unescaped PowerShell variable in a Windows script");
});

Deno.test("bundled catalog - an apt removal checks what else apt would remove first", async () => {
  // `apt remove` silently drags out every reverse-dependency. Measured on a real machine: removing
  // `curl` would also have uninstalled Steam, and removing `python3-pip` would have uninstalled a
  // PAM authentication module. Uninstalling one entry must never quietly take unrelated software
  // with it, so every apt removal simulates first and exits 3 — declined, nothing changed — when
  // the simulation lists anything the entry does not own.
  //
  // thunderbird and winboat were written later than the rest and went straight to `apt remove -y`.
  const offenders: string[] = [];
  for (const entryDir of await entryDirs()) {
    let source: string;
    try {
      source = await Deno.readTextFile(`${entryDir}/linux/remove.sh`);
    } catch {
      continue;
    }
    const lines = source.split("\n").filter((line) => !line.trimStart().startsWith("#"));
    if (!lines.some((line) => /\bapt(-get)?\s+(remove|purge)/.test(line))) continue;
    const simulates = lines.some((line) => /apt-get\s+-s\s+remove/.test(line));
    if (!simulates || !/\bexit 3\b/.test(source)) {
      offenders.push(`${entryDir}/linux/remove.sh`);
    }
  }
  assertEquals(offenders, [], "an apt removal with no collateral check");
});

Deno.test("bundled catalog - a winget install, upgrade or uninstall disables interactivity", async () => {
  // winget prompts and animates unless told not to, and neither is survivable unattended. Brave's
  // uninstall sat waiting on a survey dialog nobody could see until the harness killed it at ten
  // minutes — and killing winget mid-uninstall leaves the Windows installer lock held, so the
  // following sixteen entries each sat on "Waiting for another install/uninstall to complete..."
  // for ten minutes of their own. One interactive uninstaller cost about two and a half hours and
  // the rest of the run.
  //
  // It is also why the logs were unreadable: jq's was 236 KB, almost entirely spinner frames
  // redrawn into a redirected file.
  //
  // `winget list` is exempt: it is a query, it neither prompts nor animates.
  const offenders: string[] = [];
  for (const entryDir of await entryDirs()) {
    for (const op of ["install", "update", "remove", "detect", "run"]) {
      const path = `${entryDir}/windows/${op}.sh`;
      let source: string;
      try {
        source = await Deno.readTextFile(path);
      } catch {
        continue;
      }
      source.split("\n").forEach((line, index) => {
        if (line.trimStart().startsWith("#")) return;
        // A line that only prints the word is not running the command.
        if (/^\s*(echo|printf)\b/.test(line.trimStart())) return;
        if (!/\bwinget\s+(install|upgrade|uninstall)\b/.test(line)) return;
        // The flags may sit on a continuation line, so the whole command is what gets checked.
        const command = source.split("\n").slice(index).join("\n").split(/\n(?!\s)/)[0];
        if (!command.includes("--disable-interactivity")) {
          offenders.push(`${path}:${index + 1}: winget without --disable-interactivity`);
        }
      });
    }
  }
  assertEquals(offenders, [], "a winget mutation that can block on a prompt");
});

Deno.test("bundled catalog - no script ends a line with an escaped backslash", async () => {
  // `\\` at the end of a line is an escaped backslash, not a line continuation. The command ends
  // there and receives a literal `\` as its last argument, and whatever was meant to continue it
  // runs as a command of its own.
  //
  // Seven Windows entries shipped this from the day the catalog was written — claude-desktop,
  // element, libreoffice, logi-options-plus, podman, thunderbird, wireguard. Each ran
  // `winget install --id X -e \`, which with `-e` matched nothing, so all seven reported "No
  // package found matching input criteria" and none of them had ever been able to install. It went
  // unnoticed for as long as it did because no Windows lifecycle run had ever completed.
  const offenders: string[] = [];
  for (const entryDir of await entryDirs()) {
    for (const platform of ["linux", "macos", "windows"]) {
      for (const op of ["detect", "install", "update", "remove", "run"]) {
        const path = `${entryDir}/${platform}/${op}.sh`;
        let source: string;
        try {
          source = await Deno.readTextFile(path);
        } catch {
          continue;
        }
        source.split("\n").forEach((line, index) => {
          // An odd number of trailing backslashes continues the line; an even number does not.
          const trailing = /(\\+)$/.exec(line);
          if (trailing && trailing[1].length % 2 === 0) {
            offenders.push(
              `${path}:${index + 1}: line ends with \\\\, which is not a continuation`,
            );
          }
        });
      }
    }
  }
  assertEquals(offenders, [], "an escaped backslash where a line continuation was meant");
});

Deno.test("bundled catalog - New-Item on a registry key checks Test-Path first", async () => {
  // Microsoft documents that New-Item -Force on an existing registry key does not merely ensure
  // it: "the key and all properties and values will be overwritten with an empty registry key".
  //
  // In a loop writing several values to one key, each pass therefore wiped what the pass before it
  // had written and only the last survived. location-services, search-web-results and
  // windows-recall all printed "applied" and then failed detection for exactly this reason, while
  // delivery-optimization — one value per key — passed, which is what made the pattern visible.
  //
  // Even where an entry writes a single value it must still check, because the wipe takes any
  // other value under that key with it, and clearing settings the user did not ask about is not
  // an entry's business.
  const offenders: string[] = [];
  for (const entryDir of await entryDirs()) {
    for (const op of ["install", "update", "remove"]) {
      const path = `${entryDir}/windows/${op}.sh`;
      let source: string;
      try {
        source = await Deno.readTextFile(path);
      } catch {
        continue;
      }
      if (!/New-Item\s+-Path/.test(source)) continue;
      if (!source.includes("Test-Path")) {
        offenders.push(`${path}: New-Item -Force with no Test-Path guard`);
      }
    }
  }
  assertEquals(offenders, [], "a registry key creation that can wipe existing values");
});

Deno.test("bundled catalog - a Windows switch starting with a slash is protected from Git Bash", async () => {
  // These scripts run under Git Bash, which rewrites any argument that looks like a POSIX path
  // into a Windows one before the native program sees it. A switch like /S or /silent becomes
  // something like C:/Program Files/Git/S, and the program either rejects it or ignores it.
  //
  // It cost three separate failures, none of which looked related: reg.exe answered "ERROR:
  // Invalid syntax" so Helium could never be detected, VLC's uninstaller treated /S as a path and
  // did nothing while still exiting 0, and Helium's installer ignored /silent /install outright.
  // MSYS_NO_PATHCONV=1 on the invocation passes the switch through unchanged.
  const offenders: string[] = [];
  for (const entryDir of await entryDirs()) {
    for (const op of ["detect", "install", "update", "remove", "run"]) {
      const path = `${entryDir}/windows/${op}.sh`;
      let source: string;
      try {
        source = await Deno.readTextFile(path);
      } catch {
        continue;
      }
      source.split("\n").forEach((line, index) => {
        if (line.trimStart().startsWith("#")) return;
        if (line.includes("MSYS_NO_PATHCONV")) return;
        // A line that only prints the command is not running it — `echo "running: $u /S"` is
        // reporting, not invoking, and conversion never touches it.
        if (/^\s*(echo|printf)\b/.test(line.trimStart())) return;
        // A bare /Switch argument: preceded by whitespace, not part of a path or a URL. The
        // terminator is a lookahead rather than \s, because `"$uninstaller" /S; rc=$?` ends the
        // switch with a semicolon — which an earlier version of this test did not match, so it
        // passed over the very line it was written for.
        if (!/\s\/[A-Za-z][A-Za-z0-9]*(?![\w/])/.test(line)) return;
        // Only meaningful when a native program is being run on that line.
        if (!/\.exe|\$\w*(INSTALLER|UNINSTALLER|uninstaller|setup)/i.test(line)) return;
        offenders.push(`${path}:${index + 1}: /switch will be rewritten by Git Bash`);
      });
    }
  }
  assertEquals(offenders, [], "a Windows switch Git Bash will mangle into a path");
});
