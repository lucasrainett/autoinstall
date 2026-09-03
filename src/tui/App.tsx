// App shell — TASKS.md §2. The three-pane layout (category list / detail / log) driven by the pure
// layout math in layout.ts, wired to the *real* engine: the actual bundled catalog, loaded and
// diagnosed for real (spawning real detect.sh scripts) — not fake placeholder data. This file
// itself is integration/manual, not unit-tested, per this project's convention — see
// scripts/inspect-tui.tsx for how to actually look at it.
//
// Full flow: "browse" (the 3-pane view below) -> Enter computes a plan and moves to "confirm"
// (PlanReviewScreen, already built/tested in an earlier task) -> confirming moves to "progress"
// (ProgressView, same) and actually runs the plan through the exact same runPlanAction the --yes
// CLI path uses (src/cli/run.ts) -> "done" shows a summary, then back to "browse" with a fresh
// diagnostic scan so the list reflects what just changed. Only one screen is mounted at a time,
// so there's no keybinding conflict between e.g. CheckboxList's search box and PlanReviewScreen's
// y/N confirm — an unmounted component's useInput hook simply isn't registered.

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { MouseProvider } from "@ink-tools/ink-mouse";
import { computeLayout } from "./layout.ts";
import { setMouseTracking } from "./terminal.ts";
import { CheckboxList } from "./CheckboxList.tsx";
import { statusIndicatorFor } from "./checkbox-list.ts";
import { OUTCOME, PANE_ICONS, STATUS_EMOJI } from "./glyphs.ts";
import type { ListItem } from "./checkbox-list.ts";
import { PlanReviewScreen } from "./PlanReviewScreen.tsx";
import { ProgressView } from "./ProgressView.tsx";
import { executePlanActions, initializeProgress, type ProgressState } from "./progress.ts";
import { resolveKeyAction } from "./input.ts";
import { bootstrapCatalog, runPreflight } from "../startup/bootstrap.ts";
import { materializeAssetDir } from "../startup/assets.ts";
import { wslNotice } from "../startup/wsl-notice.ts";
import { detectWsl } from "../platform/wsl.ts";
import type { RequirementCheck } from "../diagnostics/requirements.ts";
import { reconcileWithRememberedSelection } from "../diagnostics/reconcile.ts";
import { diffSelections } from "../config/diff.ts";
import { summarizeHistory } from "../history/summary.ts";
import { writeManifest } from "../manifest/store.ts";
import { readManifest } from "../manifest/store.ts";
import { importManifest } from "../manifest/apply.ts";
import { checkForUpdate } from "../update/version.ts";
import { isDevelopmentBuild, TOOL_VERSION } from "../version.ts";
import { entryKey } from "../catalog/types.ts";
import { entriesForPlatform } from "../catalog/applicable.ts";
import { formatScanProgress, progressBar, spinnerFrame } from "./spinner.ts";
import type { CatalogEntry, Platform } from "../catalog/types.ts";
import { detectCurrentOS, osKindToPlatform } from "../platform/os.ts";
import { runDiagnosticScan } from "../diagnostics/scan.ts";
import { runScript } from "../exec/runner.ts";
import { resolveScriptShell } from "../exec/shell-resolution.ts";
import { runPlanAction } from "../exec/plan-runner.ts";
import { buildScriptEnv } from "../exec/script-env.ts";
import type { DiagnosticSnapshotEntry } from "../diagnostics/scan.ts";
import { computePlan, type Plan } from "../plan/compute.ts";
import type { ExecutionResult } from "./progress.ts";
import { resolveConfigPathOnDisk } from "../config/path.ts";
import { appendHistoryRecord } from "../history/store.ts";
import type { HistoryRecord } from "../history/types.ts";
import { planRequiresElevation } from "../elevation/plan-requirement.ts";
import { HistoryScreen } from "./HistoryScreen.tsx";
import { ProfilePicker } from "./ProfilePicker.tsx";
import { buildHistoryView, type HistoryViewRun } from "./history-view.ts";
import { readHistory } from "../history/store.ts";
import { applyProfile } from "../profiles/apply.ts";
import type { Profile } from "../profiles/types.ts";
import { readUserConfig, writeUserConfig } from "../config/store.ts";
import { DESIRED_STATE_MODEL, resolveInitialSelection } from "../config/migrate.ts";
import {
  entriesNeedingIdentity,
  identityIsConfigured,
  identityNotice,
} from "../startup/identity-notice.ts";
import {
  diskEncryptionNotice,
  probeLinuxEncryption,
  probeMacosEncryption,
  probeWindowsEncryption,
} from "../diagnostics/disk-encryption.ts";
import {
  realSudoRunner,
  releaseSudoAccess,
  requestSudoAccess,
  startSudoKeepAlive,
} from "../elevation/session.ts";
import { dirname, join } from "@std/path";

const CATALOG_ROOT = new URL("../../catalog", import.meta.url).pathname;

/** Deno.consoleSize() throws outright when stdin/stdout/stderr aren't a real terminal (e.g. piped
 * output) — falls back to a reasonable default rather than crashing the whole app. */
function consoleSizeOrDefault(): { columns: number; rows: number } {
  try {
    return Deno.consoleSize();
  } catch {
    return { columns: 80, rows: 24 };
  }
}

type Screen =
  | "browse"
  | "confirm"
  | "progress"
  | "done"
  | "history"
  | "profiles"
  | "help"
  | "notices";

const FULL_WIDTH_SCREENS = new Set<Screen>(["help", "history", "profiles", "notices"]);

/** Detect scripts are quick checks by design; anything slower is treated as a failed probe rather
 * than being allowed to hold up startup. */
const DETECT_TIMEOUT_MS = 60_000;

const PROFILES_ROOT = new URL("../../profiles", import.meta.url).pathname;

/** Held as a constant rather than written inline: the leading space matters (it separates this
 * from the status word before it), and an inline JSX literal loses it to the linter's autofix. */
const SELECTED_SUFFIX = " · selected";

export function AppShell() {
  const { suspendTerminal } = useApp();
  const [terminalSize, setTerminalSize] = useState(consoleSizeOrDefault);

  useEffect(() => {
    // Neither Node-compat's stdout 'resize' event nor Deno's own SIGWINCH signal listener
    // actually fires once Ink has put stdin into raw mode (confirmed empirically — both work
    // fine before raw mode is active, neither fires after; likely a Deno/Ink raw-mode
    // interaction, not something fixable at this layer). Deno.consoleSize() itself does stay
    // accurate though, so polling it is a real, verified working fallback rather than a hopeful
    // guess — this is not the "elegant" event-driven approach, but it's the one that works here.
    const id = setInterval(() => {
      const next = consoleSizeOrDefault();
      setTerminalSize((prev) =>
        prev.columns === next.columns && prev.rows === next.rows ? prev : next
      );
    }, 250);
    return () => clearInterval(id);
  }, []);

  const layout = computeLayout(terminalSize);

  const [status, setStatus] = useState("loading catalog...");
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [snapshot, setSnapshot] = useState<DiagnosticSnapshotEntry[]>([]);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [cursorKey, setCursorKey] = useState<string | undefined>(undefined);
  const [platform, setPlatform] = useState<Platform | undefined>(undefined);

  const [screen, setScreen] = useState<Screen>("browse");
  const [searching, setSearching] = useState(false);
  const [plan, setPlan] = useState<Plan | undefined>(undefined);
  const [progressState, setProgressState] = useState<ProgressState>(new Map());
  const [results, setResults] = useState<ExecutionResult[]>([]);
  const [historyRuns, setHistoryRuns] = useState<HistoryViewRun[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  // Guards the persistence effect below: without it the effect's first run (with the initial empty
  // selection, before the saved config has loaded) would immediately overwrite the saved file.
  const [configLoaded, setConfigLoaded] = useState(false);
  /** Identity handed to catalog scripts as environment (see exec/script-env.ts) — the only way a
   * standalone bash script can apply the user's name/email without the catalog hardcoding it. */
  const [scriptEnv, setScriptEnv] = useState<Record<string, string>>({});
  /** Absolute path to Git Bash on Windows; undefined elsewhere, where plain "bash" is correct. */
  const [scriptShell, setScriptShell] = useState<string | undefined>(undefined);
  const [preflight, setPreflight] = useState<RequirementCheck[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  /** How many guarded background tasks are in flight. A count, not a boolean, so overlapping
   * tasks cannot have the first one to finish clear the indicator while others still run. */
  const [busyCount, setBusyCount] = useState(0);
  /** Set while the list cursor rests on a category header, so the detail pane describes the
   * category rather than going blank. */
  const [cursorCategory, setCursorCategory] = useState<string | undefined>(undefined);
  /** Bumped on every entry into the confirm gate. Used as the plan pane's React key so the pane
   * remounts, which is what resets its one-shot confirm controller. */
  const [confirmSession, setConfirmSession] = useState(0);
  /** Shown when a keypress was refused because a scan is in flight. The status line is taken over
   * by the progress bar at that moment, so a plain setStatus would be invisible — which is how
   * "Enter does nothing" felt in the first place. */
  const [waitNotice, setWaitNotice] = useState<string | undefined>(undefined);
  /** Live progress of the startup scan, which spawns one subprocess per entry. */
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | undefined>(
    undefined,
  );
  const [spinnerTick, setSpinnerTick] = useState(0);
  // Only ticks while something is actually running: an animation that never stops is noise, and
  // one that keeps re-rendering an idle app is wasted work.
  useEffect(() => {
    if (busyCount === 0) return;
    const id = setInterval(() => setSpinnerTick((t) => t + 1), 90);
    return () => clearInterval(id);
  }, [busyCount]);
  /** Entries explicitly marked for update this run. Separate from `selection` because a checkbox
   * is binary and can only say whether something should be present — it has no way to express
   * "and bring this one up to date". Not persisted: presence is a lasting statement about the
   * machine, "update this now" is about one run. */
  const [updateKeys, setUpdateKeys] = useState<Set<string>>(new Set());

  /**
   * Runs an async operation started from a synchronous context — an effect body, a key handler, a
   * callback prop — without ever letting a rejection escape.
   *
   * This is not defensive padding. An unhandled rejection while Ink holds stdin in raw mode kills
   * the process *without* running Ink's cleanup, leaving the terminal full of garbage, beeping on
   * mouse movement and unresponsive to Ctrl+C — this project already shipped exactly that bug
   * once, from a history write that threw. `main.tsx` keeps a last-resort net for it, but a net
   * only stops the crash; it cannot put the UI back into a sensible state or tell the user what
   * failed. Handling it here does both.
   */
  function guard(context: string, task: () => Promise<unknown>, onFailure?: () => void): void {
    // Every async operation in this app already goes through here, so counting them makes the
    // busy indicator cover all background work — startup, overlay sync, history loads, a running
    // plan — without each call site remembering to flag itself.
    setBusyCount((n) => n + 1);
    task()
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setStatus(`${context} failed — ${message}`);
        setNotices((n) => [...n, `${context} failed: ${message}`]);
        onFailure?.();
      })
      .finally(() => setBusyCount((n) => Math.max(0, n - 1)));
  }

  /** Returns the scan as well as storing it, so startup can reconcile it against the restored
   * selection without running the (expensive, real-subprocess) scan a second time. */
  async function runDiagnosticsFor(
    loaded: CatalogEntry[],
    forPlatform: Platform,
    /** Passed explicitly rather than read from state: this runs during startup, before a
     * setState from the same tick is observable, so state would still be undefined here. */
    shell?: string,
  ): Promise<DiagnosticSnapshotEntry[]> {
    setStatus(
      `running diagnostics for ${loaded.length} entr${loaded.length === 1 ? "y" : "ies"}...`,
    );
    setScanProgress({ done: 0, total: 0 });
    const scan = await runDiagnosticScan(
      loaded,
      forPlatform,
      // Detect scripts are meant to be quick checks. Bounding them matters because this runs for
      // every entry at startup: one script that blocks (a hung package manager, a network read
      // with no timeout) would otherwise stall the whole app before the UI is ever usable.
      (scriptPath) =>
        runScript(scriptPath, {
          timeoutMs: DETECT_TIMEOUT_MS,
          ...(shell !== undefined ? { shell } : {}),
        }),
      (done, total) => setScanProgress({ done, total }),
    );
    setScanProgress(undefined);
    setWaitNotice(undefined);
    setSnapshot(scan);
    setStatus(`ready — ${scan.length} entr${scan.length === 1 ? "y" : "ies"} diagnosed`);
    return scan;
  }

  async function runDiagnostics(loaded: CatalogEntry[], forPlatform: Platform) {
    await runDiagnosticsFor(loaded, forPlatform, scriptShell);
  }

  useEffect(() => {
    guard("startup", async () => {
      const os = await detectCurrentOS();
      const detectedPlatform = osKindToPlatform(os.kind);
      setPlatform(detectedPlatform);

      // §1.4: the pre-flight runs BEFORE the selection UI is usable, so a machine with no
      // internet or no disk space says so up front instead of failing mid-install.
      // Windows runs catalog scripts through Git Bash. Resolved before the diagnostic scan,
      // because without it every script would fail on a spawn error rather than a useful message.
      const shellResolution = await resolveScriptShell();
      if (shellResolution.shell !== undefined) setScriptShell(shellResolution.shell);

      setStatus("checking system requirements...");
      const checks = await runPreflight();
      setPreflight(checks);
      const failed = checks.filter((c) => !c.passed);

      const configPath = resolveConfigPathOnDisk(detectedPlatform);
      let config;
      let configReadable = true;
      try {
        config = await readUserConfig(configPath);
      } catch (err) {
        // Critically, persistence stays OFF in this case (configLoaded is never set below), so a
        // config we failed to read is never overwritten with an empty one — that would destroy
        // the user's real selections and overlay repos.
        config = { selectedKeys: [], overlayRepos: [] };
        configReadable = false;
        setStatus(`could not read saved config — ${(err as Error).message}`);
        setNotices((n) => [
          ...n,
          `config at ${configPath} could not be read; your selection will NOT be saved this run so the existing file is left untouched — ${
            (err as Error).message
          }`,
        ]);
      }

      setStatus(
        config.overlayRepos.length > 0
          ? `syncing ${config.overlayRepos.length} overlay repo(s)...`
          : "loading catalog...",
      );

      // Loads the bundled catalog, layers the user's own overlay repos on top (§1.9), and
      // validates every profile against the merged result (§1.8).
      // Previously-seen catalog keys let §1.11 report what changed since last run. Stored beside
      // the config rather than inside it: it's derived cache state, not user configuration.
      const keysPath = join(dirname(configPath), "catalog-keys.json");
      let previousCatalogKeys = new Set<string>();
      try {
        previousCatalogKeys = new Set(JSON.parse(await Deno.readTextFile(keysPath)) as string[]);
      } catch {
        previousCatalogKeys = new Set(); // absent on first run, which is not an error
      }

      // From a compiled binary the bundled catalog/profiles live in a virtual filesystem that
      // `bash` cannot execute from, so they are extracted to a real directory first. No-op when
      // running from source.
      const assetsDir = join(dirname(configPath), "assets");
      const catalogRoot =
        (await materializeAssetDir(CATALOG_ROOT, join(assetsDir, "catalog"))).root;
      const profilesRoot =
        (await materializeAssetDir(PROFILES_ROOT, join(assetsDir, "profiles"))).root;

      const boot = await bootstrapCatalog({
        catalogRoot,
        profilesRoot,
        overlayRepos: config.overlayRepos,
        overlaysDir: join(dirname(configPath), "overlays"),
        platform: detectedPlatform,
        previousCatalogKeys,
      });

      try {
        await Deno.mkdir(dirname(keysPath), { recursive: true });
        await Deno.writeTextFile(keysPath, JSON.stringify(boot.catalogKeys));
      } catch {
        // Losing this cache only costs one run's worth of change reporting — never fatal.
      }
      setEntries(boot.entries);
      setProfiles(boot.profiles);

      setScriptEnv(buildScriptEnv(config));

      const restored = new Set(config.selectedKeys);
      if (restored.size > 0) setSelection(restored);
      if (configReadable) setConfigLoaded(true);

      const scan = await runDiagnosticsFor(boot.entries, detectedPlatform, shellResolution.shell);

      // Seed the selection from what is actually installed, but ONLY when there is no saved
      // selection yet. This is what makes the desired-state model safe: the checkbox means "this
      // should be on my machine", so an empty selection on a machine full of software would
      // otherwise read as "remove all of it". On a first run everything present starts checked,
      // and unchecking becomes a deliberate act.
      //
      // On later runs the saved file is authoritative and is NOT re-seeded — re-adding whatever
      // happens to be installed would silently undo an intentional uncheck. Anything installed
      // outside the tool since last run is surfaced by the reconciliation notice instead.
      // The selection this run actually starts from. Three cases — first run, already-migrated,
      // and a config written before the model changed — all decided by one tested function rather
      // than by conditions spread through this effect. The change report below compares against
      // *this*, not against `restored`: seeding and migration are the tool's doing, not the
      // user's, and reporting them as changes would announce every installed entry as newly added.
      const present = scan
        .filter((s) => s.result.ok && s.result.state !== "unsatisfied")
        .map((s) => s.key);
      // Entries can be renamed or split (Steam became steam-deb/steam-flatpak), which leaves the
      // old id sitting in the saved selection forever, reported on every single launch. Dropping
      // it is only safe when the catalog is known-complete: an overlay repo that failed to clone
      // takes its entries with it, and pruning then would discard real choices.
      const knownKeys = new Set(boot.entries.map(entryKey));
      const stale = boot.catalogComplete
        ? new Set(config.selectedKeys.filter((k) => !knownKeys.has(k)))
        : new Set<string>();
      // Entries the catalog has gained since the last run. Passed in so an entry the user has
      // never been shown is not mistaken for one they deliberately unchecked.
      const newlyKnownKeys = previousCatalogKeys.size === 0
        ? [] // first run: everything is "new", and the empty-selection seeding already covers it
        : [...knownKeys].filter((k) => !previousCatalogKeys.has(k));

      const initial = resolveInitialSelection({
        savedKeys: config.selectedKeys.filter((k) => !stale.has(k)),
        selectionModel: config.selectionModel,
        presentKeys: present,
        newlyKnownKeys,
      });
      const seedNotices = initial.notices;
      const effectiveSelection = initial.selection;

      // Stamp the model onto the config immediately, rather than waiting for the persistence
      // effect. A migrated selection that is never written back would be re-migrated every run,
      // and — worse — a user who unchecks something and quits without changing anything else
      // would have that uncheck silently undone by the next migration.
      if (initial.needsPersist || stale.size > 0) {
        try {
          const path = resolveConfigPathOnDisk(detectedPlatform);
          await writeUserConfig(path, {
            ...config,
            selectedKeys: [...effectiveSelection].sort(),
            selectionModel: DESIRED_STATE_MODEL,
          });
        } catch (err) {
          setNotices((n) => [
            ...n,
            `could not record the selection model — ${(err as Error).message}`,
          ]);
        }
      }
      // Set *after* the marker is on disk: the persistence effect fires on this change and reads
      // the config back, so writing the selection first could race it into saving a config with
      // no model marker — which would re-run the migration on the next start.
      setSelection(effectiveSelection);

      // §1.7/§1.4: what the user chose last time vs. what is actually true on the machine now —
      // both are surfaced, rather than letting one silently win.
      const disagreements = reconcileWithRememberedSelection(scan, restored);
      const catalogKeys = new Set(boot.entries.map(entryKey));

      // "What changed since last run" (§1.7) needs a *previous* selection to compare against, so
      // one is kept beside the config. An earlier version passed the restored selection as both
      // arguments, which made `added` and `removed` empty by construction — the diff was wired up
      // but could never report anything, and only its stale-key output was ever used.
      const previousPath = join(dirname(configPath), "previous-selection.json");
      let previousSelection = effectiveSelection;
      try {
        previousSelection = new Set(
          JSON.parse(await Deno.readTextFile(previousPath)) as string[],
        );
      } catch {
        // No record yet: this run is the baseline, so it reports no change rather than reporting
        // the entire starting selection as newly added.
      }
      const diff = diffSelections(previousSelection, effectiveSelection, catalogKeys);
      try {
        await Deno.mkdir(dirname(previousPath), { recursive: true });
        await Deno.writeTextFile(previousPath, JSON.stringify([...effectiveSelection].sort()));
      } catch {
        // Losing this only costs one run's worth of change reporting — never fatal.
      }

      // Built as one list and set once: an earlier version appended the seeding notice separately
      // and this assignment silently overwrote it, so the notice never reached the screen.
      // Windows only, and advisory: WSL setup reboots the machine, so the tool reports what is
      // possible rather than doing it.
      let wslMessage: string | undefined;
      if (detectedPlatform === "windows") {
        try {
          wslMessage = wslNotice(detectedPlatform, await detectWsl());
        } catch {
          wslMessage = undefined; // a failed probe is not worth surfacing as an error
        }
      }

      // Advisory, and never a catalog entry: enabling full-disk encryption on a machine that
      // already holds data is a reinstall on Linux and a lengthy conversion needing a stored
      // recovery key elsewhere. A checkbox would promise something the tool must not do.
      let encryptionWarning: string | undefined;
      try {
        const run = async (cmd: string, args: string[]) => {
          const out = await new Deno.Command(cmd, {
            args,
            stdin: "null",
            stdout: "piped",
            stderr: "null",
          }).output();
          return { code: out.code, stdout: new TextDecoder().decode(out.stdout) };
        };
        const probe = detectedPlatform === "macos"
          ? await probeMacosEncryption(run)
          : detectedPlatform === "windows"
          ? await probeWindowsEncryption(run)
          : await probeLinuxEncryption(run);
        encryptionWarning = diskEncryptionNotice(probe, detectedPlatform);
      } catch {
        encryptionWarning = undefined; // advisory only; never worth failing startup over
      }

      // Only scanned when there is actually no identity: entries that apply the user's name and
      // email are unsatisfiable without one, and previously said nothing about why.
      let identityWarning: string | undefined;
      if (!identityIsConfigured(config.identity)) {
        try {
          identityWarning = identityNotice(
            configPath,
            await entriesNeedingIdentity(boot.entries, detectedPlatform, Deno.readTextFile),
          );
        } catch {
          identityWarning = undefined; // advisory only; never worth failing startup over
        }
      }

      const collected = [
        ...seedNotices,
        ...(identityWarning !== undefined ? [identityWarning] : []),
        ...(encryptionWarning !== undefined ? [encryptionWarning] : []),
        ...(wslMessage !== undefined ? [wslMessage] : []),
        ...(shellResolution.error !== undefined ? [shellResolution.error] : []),
        ...failed.map((c) => `requirement not met — ${c.name}: ${c.reason}`),
        ...boot.warnings,
        ...diff.noLongerInCatalog.map((k) =>
          boot.catalogComplete
            ? `dropped from your selection — no longer in the catalog: ${k}`
            : `previously selected entry not in the catalog right now: ${k} (a source failed to load, so it has been kept)`
        ),
        ...(diff.added.length > 0
          ? [`selection changed since last run — added: ${diff.added.join(", ")}`]
          : []),
        ...(diff.removed.length > 0
          ? [`selection changed since last run — removed: ${diff.removed.join(", ")}`]
          : []),
        ...disagreements.map((d) =>
          d.wasSelected
            ? `${d.key}: selected last time, but is not installed now`
            : `${d.key}: installed on this machine, but not in your selection`
        ),
      ];
      setNotices(collected);

      // Non-blocking, and opt-in: this project's own repo name isn't settled yet (Phase 8), so
      // rather than hardcoding a guess that would 404 for everyone, the check only runs when a
      // repo is configured via AUTOINSTALL_UPDATE_REPO ("owner/name").
      const updateRepo = Deno.env.get("AUTOINSTALL_UPDATE_REPO");
      // Skipped for a working-copy build: its version is not a release number, so every comparison
      // would report "out of date" and the notice would appear on every single run.
      if (updateRepo !== undefined && updateRepo.length > 0 && !isDevelopmentBuild()) {
        checkForUpdate(TOOL_VERSION, updateRepo)
          .then((r) => {
            if (r.ok && r.status === "update-available") {
              setNotices((n) => [
                ...n,
                `a newer version of this tool is available (${r.latestVersion}, running ${TOOL_VERSION})`,
              ]);
            }
          })
          .catch(() => {}); // a failed update check must never delay or break startup
      }
    });
  }, []);

  // Persist the selection whenever it changes. Writing the whole config back (rather than only the
  // keys) keeps identity/overlay settings the user set elsewhere intact.
  useEffect(() => {
    if (!configLoaded || platform === undefined) return;
    // No inner try/catch: `guard` already reports the failure on the status line *and* records it
    // on the notices screen. Catching here as well set the status but swallowed the notice, so a
    // failing save scrolled away with the next status update and left no trace.
    guard("saving your selection", async () => {
      const path = resolveConfigPathOnDisk(platform);
      const config = await readUserConfig(path);
      await writeUserConfig(path, { ...config, selectedKeys: [...selection].sort() });
    });
  }, [selection, configLoaded, platform]);

  useInput((input, key) => {
    if (screen !== "browse") return;
    if (searching) return; // the search field owns every key while it's open

    // "h" opens the run history and "p" the profile picker. Both read from disk on open rather
    // than caching at startup, so the history reflects runs made since launch.
    if (input === "n") {
      setScreen("notices");
      return;
    }
    if (input === "e" || input === "i") {
      // Manifest export/import (§1.10): a portable snapshot of the selection, deliberately
      // without identity — a manifest may be shared with someone else, so embedding name/email
      // would be a quiet privacy leak.
      guard(input === "e" ? "exporting the manifest" : "importing the manifest", async () => {
        if (platform === undefined) return;
        const manifestPath = join(dirname(resolveConfigPathOnDisk(platform)), "manifest.toml");
        try {
          if (input === "e") {
            const cfg = await readUserConfig(resolveConfigPathOnDisk(platform));
            await writeManifest(manifestPath, {
              selectedKeys: [...selection].sort(),
              overlayRepos: cfg.overlayRepos,
            });
            setStatus(
              `exported ${selection.size} selected entr${
                selection.size === 1 ? "y" : "ies"
              } to ${manifestPath}`,
            );
          } else {
            const manifest = await readManifest(manifestPath);
            const result = importManifest(manifest, new Set(entries.map(entryKey)));
            setSelection(new Set(result.selectedKeys));
            setStatus(
              `imported ${result.selectedKeys.length} entr${
                result.selectedKeys.length === 1 ? "y" : "ies"
              } from ${manifestPath}` +
                (result.warnings.length > 0 ? ` (${result.warnings.length} skipped)` : ""),
            );
            if (result.warnings.length > 0) setNotices((n) => [...n, ...result.warnings]);
          }
        } catch (err) {
          setStatus(
            `manifest ${input === "e" ? "export" : "import"} failed — ${(err as Error).message}`,
          );
        }
      });
      return;
    }
    if (input === "?") {
      setScreen("help");
      return;
    }
    if (input === "h") {
      guard("opening history", async () => {
        if (platform === undefined) return;
        try {
          const path = join(dirname(resolveConfigPathOnDisk(platform)), "history.jsonl");
          setHistoryRuns(buildHistoryView(await readHistory(path), "all"));
          setScreen("history");
        } catch (err) {
          setStatus(`could not read history — ${(err as Error).message}`);
        }
      });
      return;
    }
    if (input === "p") {
      if (profiles.length === 0) {
        setStatus("No profiles available — add one under profiles/ to use this.");
        return;
      }
      setScreen("profiles");
      return;
    }

    // Marks the entry under the cursor for update. Only meaningful for something that actually has
    // an update — saying so is better than silently doing nothing to a key the user just pressed.
    if (input === "u") {
      const key = cursorKey;
      if (key === undefined) return;
      const state = snapshot.find((s) => s.key === key)?.result;
      if (state === undefined || !state.ok || state.state !== "needs-update") {
        setStatus("No update available for this entry — u marks an entry showing ↑.");
        return;
      }
      setUpdateKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setStatus(
          next.has(key)
            ? `Marked for update: ${entries.find((e) => entryKey(e) === key)?.meta.name ?? key}`
            : `Update mark cleared: ${entries.find((e) => entryKey(e) === key)?.meta.name ?? key}`,
        );
        return next;
      });
      return;
    }

    // Marks everything that has an update. Without it, updating twenty entries is twenty
    // keystrokes; with it, the choice is still explicit and still visible in the plan.
    if (input === "U") {
      const outdated = snapshot
        .filter((s) => s.result.ok && s.result.state === "needs-update")
        .map((s) => s.key)
        .filter((k) => selection.has(k));
      if (outdated.length === 0) {
        setStatus("Nothing has an update available.");
        return;
      }
      const allMarked = outdated.every((k) => updateKeys.has(k));
      setUpdateKeys(allMarked ? new Set() : new Set(outdated));
      setStatus(
        allMarked
          ? "Cleared every update mark."
          : `Marked ${outdated.length} entr${outdated.length === 1 ? "y" : "ies"} for update.`,
      );
      return;
    }

    if (resolveKeyAction({ input, ...key }) !== "confirm") return;
    if (platform === undefined) return;

    // A scan in flight means the snapshot still describes the machine as it was *before* the last
    // run. Opening a plan from it proposes work that has already happened — pressing Enter right
    // after an install finished offered to install the very same entries again. Waiting a moment
    // is better than confirming a plan that is knowably out of date.
    if (scanProgress !== undefined) {
      // Not setStatus: the status line is taken over by the progress bar while a scan runs, so
      // this would be written and immediately hidden — leaving Enter looking dead, which is the
      // very complaint being fixed.
      setWaitNotice("Still checking your machine — the plan is not accurate yet, one moment…");
      return;
    }
    const computed = computePlan(entries, platform, selection, snapshot, { updateKeys });
    if (computed.actions.length === 0) {
      const pendingUpdates = computed.skipped.filter((s) => s.reason === "update-available").length;
      setStatus(
        pendingUpdates > 0
          ? `Nothing to do — ${pendingUpdates} entr${
            pendingUpdates === 1 ? "y has" : "ies have"
          } an update available; press u on one (or U for all), then Enter.`
          : "Nothing to do — nothing selected needs an action. Press Enter after selecting something.",
      );
      return;
    }
    setPlan(computed);
    setConfirmSession((n) => n + 1);
    setScreen("confirm");
  });

  async function runPlan(toRun: Plan) {
    // A plan needing sudo used to just run its scripts and let their own `sudo` calls fail —
    // there was never a real credential-acquisition step, only the (unused) policy pieces in
    // src/elevation/. That's the exact bug behind a real Terraform install failing with "sudo: a
    // password is required" (see TASKS.md). Ask once, up front, only when the plan actually needs
    // it — never "just in case" (PROJECT_DEFINITION.md §15) — and only on POSIX; Windows has no
    // equivalent cacheable-credential model and isn't handled here (Phase 7, not yet built).
    const needsElevation = Deno.build.os !== "windows" && planRequiresElevation(toRun.actions);
    let keepAlive: ReturnType<typeof startSudoKeepAlive> | undefined;

    if (needsElevation) {
      setStatus("This plan needs elevated (sudo) access — requesting it now...");
      let granted = false;
      try {
        // Ink's own suspendTerminal hands the real terminal (raw mode off, input listener fully
        // detached, alt-screen exited) to the callback for its duration, so the sudo password
        // prompt gets a genuinely uncontested terminal instead of racing Ink's own raw-mode input
        // loop for the same bytes — confirmed via the installed ink@7.1.1 source (App.js's
        // pauseInput/resumeInput, ink.js's beginSuspend/endSuspend) before relying on it.
        await suspendTerminal(async () => {
          // Ink's suspend restores raw mode and the alt screen, but knows nothing about the mouse
          // tracking modes MouseProvider turned on — and those keep emitting escape sequences on
          // every mouse move, which would land straight in sudo's password prompt. ink-mouse
          // exposes no way to scope them, so disable all four here and restore them after.
          setMouseTracking(false);
          try {
            granted = await requestSudoAccess(realSudoRunner());
          } finally {
            setMouseTracking(true);
          }
        });
      } catch (err) {
        setStatus(`could not request elevated access — ${(err as Error).message}`);
        return;
      }
      if (!granted) {
        setStatus(
          "Elevated access was not granted — this plan needs sudo for at least one action. Nothing was run.",
        );
        return;
      }
      keepAlive = startSudoKeepAlive(realSudoRunner());
    }

    setScreen("progress");
    setProgressState(initializeProgress(toRun.actions.map((a) => a.key)));

    let execResults: ExecutionResult[];
    try {
      execResults = await executePlanActions(
        toRun.actions,
        (key) =>
          runPlanAction(
            toRun.actions.find((a) => a.key === key)!,
            scriptShell === undefined
              ? undefined
              : (path, options) => runScript(path, { ...options, shell: scriptShell }),
            scriptEnv,
          ),
        setProgressState,
      );
    } finally {
      // Must be `finally`: if execution throws, a plain sequential release would be skipped,
      // leaving a repeating background `sudo -n true` timer running for the rest of the session
      // and the user's cached credential alive well past the run that needed it.
      if (keepAlive) {
        keepAlive.stop();
        await releaseSudoAccess(realSudoRunner());
      }
    }
    setResults(execResults);

    // Failures must survive leaving the summary screen. Returning to the list re-runs diagnostics,
    // which resets the status line to "ready — N entries diagnosed" and wiped the only remaining
    // sign that anything had gone wrong; the run was then only discoverable by pressing h.
    const failures = execResults.filter((r) => r.status === "failed");
    if (failures.length > 0) {
      setNotices((n) => [
        ...n,
        ...failures.map((f) =>
          `last run failed: ${entries.find((e) => entryKey(e) === f.key)?.meta.name ?? f.key}${
            f.message ? ` — ${f.message}` : ""
          }`
        ),
      ]);
    }

    // A failure writing history (e.g. a first-ever run whose ~/.config/autoinstall/ directory
    // didn't exist yet — a real crash this project hit in practice, see appendHistoryRecord's own
    // fix) must never be allowed to reach an unhandled rejection: while Ink has stdin in raw
    // mode, an uncaught error kills the process without restoring the terminal, leaving it
    // showing garbage and unresponsive to Ctrl+C. Logging is a side effect of running the plan,
    // not the plan itself — its failure is reported, not fatal.
    if (platform !== undefined) {
      try {
        const runId = crypto.randomUUID();
        const historyPath = join(dirname(resolveConfigPathOnDisk(platform)), "history.jsonl");
        for (const result of execResults) {
          const entry = entries.find((e) => entryKey(e) === result.key);
          const action = toRun.actions.find((a) => a.key === result.key);
          if (entry === undefined || action === undefined) continue; // every result key comes from toRun.actions, so this never actually happens
          const record: HistoryRecord = {
            runId,
            timestamp: new Date().toISOString(),
            key: result.key,
            kind: entry.kind,
            action: action.actionKind,
            result: result.status,
            ...(result.message !== undefined ? { message: result.message } : {}),
          };
          await appendHistoryRecord(historyPath, record);
        }
      } catch (err) {
        setStatus(`warning: could not write history — ${(err as Error).message}`);
      }
    }

    setScreen("done");
  }

  // Only what this machine can actually do something with. A platform folder's absence is the
  // catalog's way of saying the software does not exist here, and the planner already honoured it
  // — the list did not, so Linux users saw GarageBand, Keynote, Numbers and eight more that could
  // never be installed, all stuck on the "not checked" glyph because no detect ever ran for them.
  const applicable = entriesForPlatform(entries, platform);

  // One definition for both status lines (browse and the full-width screens) — they drifted once
  // already, leaving the busy indicator on the screen the user is least likely to be looking at
  // during startup.
  // Failures from the most recent run, so the list can mark them. Replaced wholesale by the next
  // run's results, so a fixed entry stops being flagged as soon as it is retried.
  const failedKeys = new Set(
    results.filter((r) => r.status === "failed").map((r) => r.key),
  );

  // What Enter would actually do, computed from the same planner the confirm screen uses so the
  // list and the plan can never disagree. Cheap: no I/O, just a pass over the snapshot.
  const livePlan: Plan = platform === undefined
    ? { actions: [], skipped: [] }
    : computePlan(entries, platform, selection, snapshot, { updateKeys });
  const pendingKeys = new Set(livePlan.actions.map((a) => a.key));

  const busyPrefix = busyCount > 0 ? `${spinnerFrame(spinnerTick)} ` : "";
  const statusText = scanProgress !== undefined
    ? formatScanProgress(scanProgress.done, scanProgress.total)
    : status;

  const items: ListItem[] = applicable.map((entry) => ({
    key: entryKey(entry),
    category: entry.category,
    name: entry.meta.name,
    description: entry.meta.description,
  }));

  const cursorEntry = applicable.find((e) => entryKey(e) === cursorKey);
  const names = new Map(entries.map((e) => [entryKey(e), e.meta.name]));

  return (
    <MouseProvider>
      <Box flexDirection="column">
        {
          /* Reference screens (help, history, profiles) take the full width instead of being
            squeezed into the detail pane: at 80 columns that pane is only ~30 wide, which wrapped
            the help text mid-phrase and clipped rows off the bottom. */
        }
        {FULL_WIDTH_SCREENS.has(screen)
          ? (
            <Box
              height={layout.categoryList.height}
              borderStyle="single"
              borderColor="cyan"
              paddingX={1}
              flexDirection="column"
            >
              {screen === "help" && <PaneTitle icon={PANE_ICONS.help} title="Help" />}
              {screen === "history" && <PaneTitle icon={PANE_ICONS.history} title="History" />}
              {screen === "profiles" && <PaneTitle icon={PANE_ICONS.profiles} title="Profiles" />}
              {screen === "notices" && <PaneTitle icon={PANE_ICONS.notices} title="Notices" />}
              {screen === "help" && (
                <DismissableScreen onDismiss={() => setScreen("browse")}>
                  <HelpScreen />
                </DismissableScreen>
              )}
              {screen === "history" && (
                <DismissableScreen onDismiss={() => setScreen("browse")}>
                  <Text bold>
                    {(() => {
                      // Aggregate counts across every recorded run — history/summary.ts existed
                      // for exactly this and had no caller, so the screen showed raw runs only.
                      const all = historyRuns.flatMap((r) => r.records);
                      const sum = summarizeHistory(all);
                      return `${all.length} record(s) · ${sum.installed.length} installed · ${sum.failed.length} failed · ${sum.skipped.length} skipped`;
                    })()}
                  </Text>
                  <HistoryScreen runs={historyRuns} />
                </DismissableScreen>
              )}
              {screen === "notices" && (
                <DismissableScreen onDismiss={() => setScreen("browse")}>
                  <NoticesScreen notices={notices} preflight={preflight} />
                </DismissableScreen>
              )}
              {screen === "profiles" && (
                <ProfilePicker
                  availableProfiles={profiles}
                  onCancel={() => setScreen("browse")}
                  onSelect={(profile) => {
                    // Profiles are additive by design (PROJECT_DEFINITION.md §2): applying one
                    // never silently deselects something already chosen.
                    setSelection(applyProfile(selection, profile));
                    setStatus(
                      `applied profile "${profile.name}" — ${profile.entryKeys.length} entr${
                        profile.entryKeys.length === 1 ? "y" : "ies"
                      } added to the selection`,
                    );
                    setScreen("browse");
                  }}
                />
              )}
            </Box>
          )
          : (
            <Box height={layout.categoryList.height}>
              <Box
                width={layout.categoryList.width}
                borderStyle="single"
                borderColor="cyan"
                paddingX={1}
                flexDirection="column"
              >
                <PaneTitle
                  icon={PANE_ICONS.catalog}
                  title={scanProgress !== undefined
                    ? `Catalog — checking ${scanProgress.done}/${scanProgress.total}`
                    : "Catalog"}
                />
                {screen === "browse"
                  ? (
                    <CheckboxList
                      items={items}
                      failedKeys={failedKeys}
                      pendingKeys={pendingKeys}
                      onCursorCategoryChange={setCursorCategory}
                      snapshot={snapshot}
                      selection={selection}
                      onSelectionChange={setSelection}
                      visibleRows={Math.max(0, layout.categoryList.height - 4)}
                      onCursorChange={(item) => setCursorKey(item?.key)}
                      onSearchModeChange={setSearching}
                    />
                  )
                  : (
                    <Text dimColor>
                      {selection.size} item{selection.size === 1 ? "" : "s"} selected
                    </Text>
                  )}
              </Box>
              <Box flexDirection="column">
                <Box
                  width={layout.detail.width}
                  height={layout.detail.height}
                  borderStyle="single"
                  paddingX={1}
                  flexDirection="column"
                >
                  <PaneTitle
                    icon={screen === "confirm"
                      ? PANE_ICONS.plan
                      : screen === "progress"
                      ? PANE_ICONS.progress
                      : screen === "done"
                      ? PANE_ICONS.done
                      : PANE_ICONS.details}
                    title={screen === "confirm"
                      ? "Plan"
                      : screen === "progress"
                      ? "Running"
                      : screen === "done"
                      ? "Result"
                      : "Details"}
                  />
                  {screen === "browse" && cursorEntry && (
                    <>
                      <Text bold>{cursorEntry.meta.name}</Text>
                      <Text>{cursorEntry.meta.description}</Text>
                      {cursorEntry.meta.website && <Text dimColor>{cursorEntry.meta.website}</Text>}
                      <Box marginTop={1} flexDirection="column">
                        {
                          /* The diagnosed state spelled out. The list carries only a one-character
                          glyph, which is easy to miss and unreadable without the legend. Uses the
                          same tested resolver as the glyph, so the two can never disagree. */
                        }
                        <Text>
                          {(() => {
                            switch (statusIndicatorFor(cursorKey ?? "", snapshot)) {
                              case "satisfied":
                                return <Text color="green">● Installed</Text>;
                              case "needs-update":
                                return <Text color="yellow">● Update available</Text>;
                              case "unsatisfied":
                                return <Text>○ Not installed</Text>;
                              default:
                                return <Text color="gray">? Status unknown</Text>;
                            }
                          })()}
                          {selection.has(cursorKey ?? "") && (
                            <Text color="green" bold>{SELECTED_SUFFIX}</Text>
                          )}
                        </Text>
                        {platform && cursorEntry.meta.platforms?.[platform]?.installMethod && (
                          <Text dimColor>
                            via {cursorEntry.meta.platforms[platform]?.installMethod}
                          </Text>
                        )}
                        {
                          /* Surfaced here rather than only at the review step, so the cost of a
                          choice is visible while it is being made. */
                        }
                        {platform && cursorEntry.meta.platforms?.[platform]?.requiresElevation && (
                          <Text color="yellow">requires sudo</Text>
                        )}
                        {cursorEntry.meta.destructive && (
                          <Text color="red" bold>destructive — overwrites existing state</Text>
                        )}
                        {platform && cursorEntry.meta.platforms?.[platform]?.notes && (
                          <Text dimColor>{cursorEntry.meta.platforms[platform]?.notes}</Text>
                        )}
                      </Box>
                    </>
                  )}
                  {screen === "browse" && !cursorEntry && cursorCategory !== undefined && (() => {
                    const inCategory = applicable.filter((e) => e.category === cursorCategory);
                    const selectedHere = inCategory.filter((e) =>
                      selection.has(entryKey(e))
                    ).length;
                    const installedHere = inCategory.filter((e) =>
                      statusIndicatorFor(entryKey(e), snapshot) !== "unsatisfied"
                    ).length;
                    return (
                      <>
                        <Text bold>{cursorCategory}</Text>
                        <Text dimColor>category</Text>
                        <Box marginTop={1} flexDirection="column">
                          <Text>
                            {inCategory.length} entr{inCategory.length === 1 ? "y" : "ies"}
                          </Text>
                          <Text>{selectedHere} selected · {installedHere} installed</Text>
                          <Box marginTop={1}>
                            <Text dimColor>
                              {selectedHere === inCategory.length && inCategory.length > 0
                                ? "space clears this category"
                                : "space selects every entry in this category"}
                            </Text>
                          </Box>
                        </Box>
                      </>
                    );
                  })()}
                  {screen === "browse" && !cursorEntry && cursorCategory === undefined && (
                    <Text dimColor>(select an item)</Text>
                  )}
                  {screen === "progress" && <ProgressView state={progressState} names={names} />}
                  {screen === "done" && (
                    <DoneSummary
                      results={results}
                      onDismiss={() =>
                        guard("refreshing diagnostics", async () => {
                          setScreen("browse");
                          if (platform !== undefined) await runDiagnostics(entries, platform);
                        })}
                    />
                  )}
                </Box>
                {
                  /* The plan is on screen the whole time, not only after pressing Enter — what a
                    run would do is the thing worth seeing while you are still choosing. Confirming
                    does not move it: the same pane gains the y/N prompt and takes keyboard focus. */
                }
                <Box
                  width={layout.plan.width}
                  height={layout.plan.height}
                  borderStyle="single"
                  borderColor={screen === "confirm" ? "yellow" : undefined}
                  paddingX={1}
                  flexDirection="column"
                >
                  <PaneTitle
                    icon={PANE_ICONS.plan}
                    title={`Plan${
                      livePlan.actions.length > 0 ? ` (${livePlan.actions.length})` : ""
                    }`}
                  />
                  <PlanReviewScreen
                    // Remounts on every entry into the gate. The confirm controller settles once
                    // per mount so a stray keypress cannot double-run a plan; that was correct
                    // when the component existed only for the duration of a confirm, but the pane
                    // is now on screen permanently, so the *first* confirm settled it forever and
                    // every later one opened already showing "Confirmed — applying plan..." while
                    // ignoring y, n and Escape alike. Reported by the user as being stuck.
                    key={screen === "confirm" ? `confirm-${confirmSession}` : "live"}
                    plan={screen === "confirm" && plan ? plan : livePlan}
                    catalog={entries}
                    // Minus the pane's own borders and its title row.
                    availableRows={Math.max(3, layout.plan.height - 3)}
                    confirming={screen === "confirm"}
                    onConfirm={() =>
                      // Dropping this promise would turn any failure mid-run into an unhandled
                      // rejection *and* strand the UI on the progress screen forever.
                      guard(
                        "running the plan",
                        () => runPlan(plan ?? livePlan),
                        () => setScreen("browse"),
                      )}
                    onCancel={() => setScreen("browse")}
                  />
                </Box>
              </Box>
            </Box>
          )}
        <Box height={layout.log.height} borderStyle="single" paddingX={1} flexDirection="column">
          <PaneTitle icon={PANE_ICONS.status} title="Status" />
          {screen === "browse"
            ? (
              <>
                <Text dimColor>
                  {searching
                    ? "typing search — Enter or Esc to finish · backspace to edit"
                    // The full hint line is ~110 columns wide and was silently truncated on an
                    // 80-column terminal, cutting off "Enter review & apply" and "ctrl+c quit" —
                    // the two keys a user most needs. Below that width show only the essentials
                    // and point at the help screen for the rest.
                    : terminalSize.columns >= 118
                    ? `↑↓ move · space select · / search · p profiles · h history · n notices · e/i export/import · u update${
                      updateKeys.size > 0 ? ` (${updateKeys.size})` : ""
                    } · ? help · Enter apply${
                      pendingKeys.size > 0 ? ` (${pendingKeys.size} pending)` : " (nothing pending)"
                    }`
                    : "↑↓ move · space select · / search · Enter apply · ? help · ctrl+c quit"}
                </Text>
                {
                  /* The glyph legend is ~82 columns and wraps below that, which pushed the hint
                    line out of the fixed-height log pane entirely — losing the very hints this
                    pane exists for. On a narrow terminal it yields; "?" still documents it. */
                }
                {terminalSize.columns >= 100 && (
                  <Text dimColor>
                    <Text bold>bold</Text> = will change on Enter ·{" "}
                    <Text color="yellow">{STATUS_EMOJI["needs-update"]}</Text> update ·{" "}
                    <Text color="red">{OUTCOME.failed}</Text> failed last run ·{" "}
                    <Text color="gray">{STATUS_EMOJI.unknown}</Text> not checked
                  </Text>
                )}
                {
                  /* While work is running the status line stops being dim and gains a bar. As one
                    grey row among several it was easy to miss entirely, which made a scan that
                    takes seconds look like a hang. */
                }
                {scanProgress !== undefined
                  ? (
                    <>
                      <Text color="cyan" bold>
                        {busyPrefix}
                        {progressBar(scanProgress.done, scanProgress.total, 16)} {statusText}
                      </Text>
                      {waitNotice !== undefined && <Text color="yellow">{waitNotice}</Text>}
                    </>
                  )
                  : (
                    <Text dimColor={busyCount === 0} color={busyCount > 0 ? "cyan" : undefined}>
                      {busyPrefix}
                      {statusText}
                      {notices.length > 0 && (
                        <Text color="yellow">{`  ·  ${notices.length} notice(s) — press n`}</Text>
                      )}
                    </Text>
                  )}
              </>
            )
            : (
              <>
                {screen === "help" && (
                  <Text dimColor>keyboard reference — Enter or Esc to go back</Text>
                )}
                {screen === "notices" && (
                  <Text dimColor>startup checks & warnings — Enter or Esc to go back</Text>
                )}
                {screen === "history" && (
                  <Text dimColor>
                    run history — Enter or Esc to go back
                  </Text>
                )}
                {screen === "profiles" && (
                  <Text dimColor>
                    type a profile name or paste a profile URL · Enter to apply · Esc to go back
                  </Text>
                )}
                <Text dimColor>{busyPrefix}{statusText}</Text>
              </>
            )}
        </Box>
      </Box>
    </MouseProvider>
  );
}

/** Startup checks and warnings, gathered in one place instead of flashing past in the status
 * line: failed system requirements (§1.4), catalog/overlay/profile problems, entries whose live
 * state disagrees with the remembered selection (§1.7), and manifest-import skips. */
function NoticesScreen(
  { notices, preflight }: { notices: readonly string[]; preflight: readonly RequirementCheck[] },
) {
  return (
    <Box flexDirection="column">
      <Text bold>System requirements</Text>
      {preflight.length === 0
        ? <Text dimColor>(not checked yet)</Text>
        : preflight.map((c) => (
          <Text key={c.name}>
            {c.passed
              ? <Text color="green">{`${OUTCOME.success} ${c.name}`}</Text>
              : <Text color="red">{`${OUTCOME.failed} ${c.name} — ${c.reason}`}</Text>}
          </Text>
        ))}
      <Box marginTop={1} flexDirection="column">
        <Text bold>{`Warnings (${notices.length})`}</Text>
        {notices.length === 0
          ? <Text dimColor>Nothing to report.</Text>
          : notices.map((n, i) => <Text key={i} color="yellow">{`${OUTCOME.warning} ${n}`}</Text>)}
      </Box>
    </Box>
  );
}

/** The single place keybindings are written out in full. The bottom-panel hint has to fit one
 * line and gets trimmed on narrow terminals, so without this screen those bindings would be
 * undiscoverable at 80 columns. */
/** One line at the top of a pane naming what it is. Ink's borders carry no title, so this is a
 * row inside the box — every pane that uses one budgets a row for it. */
function PaneTitle({ icon, title }: { icon: string; title: string }) {
  return <Text bold color="cyan">{icon} {title}</Text>;
}

function HelpScreen() {
  const keys: [string, string][] = [
    ["↑ ↓", "move the cursor"],
    ["space", "select / deselect — on a category row, the whole category"],
    ["a", "select all (currently matching the filter)"],
    ["c", "check / uncheck the whole category, from anywhere inside it"],
    // No deselect-all: the checkbox now means desired state, so clearing every box in one
    // keystroke would queue the removal of everything on screen.
    ["/", "search — type freely, Enter or Esc to finish"],
    // A checkbox is binary and can only say whether something should be present, so update intent
    // is carried separately and per entry rather than inferred from the checkbox.
    ["u", "mark the entry under the cursor for update (only if it shows ↑)"],
    ["U", "mark every selected entry that has an update"],
    ["p", "profiles — apply a bundle of entries"],
    ["h", "history — results of previous runs"],
    ["n", "notices — startup checks, warnings, and conflicts"],
    ["e", "export your selection to a shareable manifest"],
    ["i", "import a selection from a manifest"],
    ["?", "this help"],
    ["Enter", "review the plan, then apply it"],
    ["ctrl+c", "quit"],
  ];
  return (
    <Box flexDirection="column">
      <Text bold>Keyboard</Text>
      {keys.map(([k, what]) => (
        <Text key={k}>
          <Text color="cyan">{k.padEnd(7)}</Text>
          <Text>{what}</Text>
        </Text>
      ))}
      <Box marginTop={1} flexDirection="column">
        <Text bold>Reading a row</Text>
        <Text>
          <Text>{"[x]".padEnd(7)}</Text>you want this on the machine
        </Text>
        <Text>
          <Text bold>{"bold".padEnd(7)}</Text>this one changes when you press Enter
        </Text>
        <Text dimColor>
          {"       "}so [x] not bold means installed, and [ ] bold means about to be removed
        </Text>
        <Text>
          <Text color="yellow">{STATUS_EMOJI["needs-update"].padEnd(6)}</Text>
          update available (u marks it)
        </Text>
        <Text>
          <Text color="red">{OUTCOME.failed.padEnd(6)}</Text>failed in the last run
        </Text>
        <Text>
          <Text color="gray">{STATUS_EMOJI.unknown.padEnd(6)}</Text>could not be checked
        </Text>
      </Box>
    </Box>
  );
}

/** Wraps a read-only screen (one with no input handling of its own) so Enter/Esc returns to
 * browse — otherwise opening it would be a dead end with no way back. */
function DismissableScreen(
  { children, onDismiss }: { children: ReactNode; onDismiss: () => void },
) {
  useInput((_input, key) => {
    if (key.return || key.escape) onDismiss();
  });
  return <>{children}</>;
}

function DoneSummary(
  { results, onDismiss }: { results: readonly ExecutionResult[]; onDismiss: () => void },
) {
  useInput((_input, key) => {
    if (key.return || key.escape) onDismiss();
  });
  const succeeded = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  return (
    <Box flexDirection="column">
      <Text bold>Done.</Text>
      <Text>
        <Text color="green">{succeeded} succeeded</Text>,{" "}
        <Text color={failed > 0 ? "red" : undefined}>{failed} failed</Text>
        {skipped > 0 ? `, ${skipped} skipped` : ""}
      </Text>
      {results.filter((r) => r.status === "failed").map((r) => (
        <Text key={r.key} color="red">
          {OUTCOME.failed} {r.key}
          {r.message ? ` — ${r.message}` : ""}
        </Text>
      ))}
      {
        /* A succeeded action can still have something the user must know — a removal the
          collateral guard declined ran cleanly but removed nothing. Shown in yellow so it is not
          mistaken for either a plain success or a failure. */
      }
      {results.filter((r) => r.status === "success" && r.message !== undefined).map((r) => (
        <Text key={r.key} color="yellow">{OUTCOME.warning} {r.key} — {r.message}</Text>
      ))}
      <Box marginTop={1}>
        <Text dimColor>Press Enter or Esc to go back</Text>
      </Box>
    </Box>
  );
}
