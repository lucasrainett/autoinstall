// Real CLI entry point — TASKS.md §2 ("Unattended and dry-run CLI modes that bypass the TUI
// entirely"). Thin by design: every actual decision (what the plan is, whether a dry-run touches
// the script runner, whether unattended execution matches the interactive flow) lives in the
// tested engine modules under src/; this file only wires real I/O (disk, process, terminal) to
// them and is not itself unit-tested, per this project's integration/manual convention for
// anything touching real OS state or rendering.
//
// Usage: deno run --allow-read --allow-run --allow-write --allow-env main.tsx [--yes | --dry-run]
// No flags launches the interactive TUI; --dry-run prints the plan and exits without touching the
// script runner; --yes runs the plan for the current remembered selection with no confirmation.

import { dirname, fromFileUrl, join } from "@std/path";
import { render } from "ink";
import { parseCliArgs } from "./src/cli/args.ts";
import { runCli } from "./src/cli/run.ts";
import { AppShell } from "./src/tui/App.tsx";
import { installDebugLogging } from "./src/tui/debug-log.ts";
import { enterAltScreen, restoreTerminal } from "./src/tui/terminal.ts";
import { loadCatalog } from "./src/catalog/loader.ts";
import { materializeAssetDir } from "./src/startup/assets.ts";
import { entryKey } from "./src/catalog/types.ts";
import { detectCurrentOS, osKindToPlatform } from "./src/platform/os.ts";
import { runDiagnosticScan } from "./src/diagnostics/scan.ts";
import { runScript } from "./src/exec/runner.ts";
import { resolveScriptShell } from "./src/exec/shell-resolution.ts";
import { resolveConfigPathOnDisk } from "./src/config/path.ts";
import { readUserConfig } from "./src/config/store.ts";
import { resolveInitialSelection } from "./src/config/migrate.ts";
import { appendHistoryRecord } from "./src/history/store.ts";
import type { HistoryRecord } from "./src/history/types.ts";
import { computePlan } from "./src/plan/compute.ts";
import { planRequiresElevation } from "./src/elevation/plan-requirement.ts";
import {
  realSudoRunner,
  releaseSudoAccess,
  requestSudoAccess,
  startSudoKeepAlive,
} from "./src/elevation/session.ts";

const CATALOG_ROOT = fromFileUrl(new URL("./catalog", import.meta.url));

const args = parseCliArgs(Deno.args);

if (args.mode === "tui") {
  installDebugLogging();
  // A crash while Ink has stdin in raw mode kills the process without restoring the terminal —
  // it's left showing garbage and unresponsive to Ctrl+C, since Ink's own cleanup never runs.
  // Confirmed the hard way in real use: an unhandled rejection from a history-write failure did
  // exactly this. Every specific cause found gets fixed at its source (see appendHistoryRecord/
  // writeUserConfig/writeManifest and App.tsx's runPlan), but this is the last-resort net for
  // whatever's next — better a visible error than a broken terminal.
  globalThis.addEventListener("unhandledrejection", (event) => {
    console.error(`Unhandled error (recovered, not crashing): ${event.reason}`);
    event.preventDefault();
  });
  // A synchronous throw outside React's tree would otherwise tear the process down with the
  // terminal still in raw mode and mouse reporting on — the exact garbage-screen state this
  // project already shipped once. Restore first, then let it surface.
  globalThis.addEventListener("error", () => {
    restoreTerminal();
  });

  // Draw on the alternate screen so quitting puts the terminal back exactly as it was, instead of
  // leaving the whole interface behind in the scrollback. Paired with restoreTerminal() below,
  // which exits it again on every path out — normal quit, crash, or unhandled rejection.
  enterAltScreen();
  const { waitUntilExit } = render(<AppShell />);
  try {
    await waitUntilExit();
  } finally {
    // Belt and braces over Ink's own cleanup: mouse tracking is enabled by a third-party provider
    // that this app toggles directly, so its restoration is this app's responsibility too.
    restoreTerminal();
  }
  Deno.exit(0);
}

const os = await detectCurrentOS();
const platform = osKindToPlatform(os.kind);

// Compiled binaries keep the catalog in a virtual filesystem that spawned shells cannot reach;
// extract it to a real directory first (no-op when running from source).
const cliConfigPath = resolveConfigPathOnDisk(platform);
const catalogRoot =
  (await materializeAssetDir(CATALOG_ROOT, join(dirname(cliConfigPath), "assets", "catalog"))).root;

const { entries, errors } = await loadCatalog(catalogRoot);
if (errors.length > 0) {
  console.error(`catalog loaded with ${errors.length} error(s):`);
  for (const issue of errors) console.error(`  ${issue.path}: ${issue.message}`);
}

// Windows runs catalog scripts through Git Bash; without resolving it every script fails on a
// spawn error naming a binary a stock Windows machine has no reason to have.
const shellResolution = await resolveScriptShell();
if (shellResolution.error !== undefined) {
  console.error(shellResolution.error);
  Deno.exit(1);
}
const scriptShell = shellResolution.shell;

const snapshot = await runDiagnosticScan(
  entries,
  platform,
  (scriptPath) =>
    runScript(scriptPath, {
      timeoutMs: 60_000,
      ...(scriptShell !== undefined ? { shell: scriptShell } : {}),
    }),
);

const configPath = cliConfigPath;
const config = await readUserConfig(configPath);

// The CLI must resolve the selection exactly as the interactive app does, and for a long time it
// did not: it read `config.selectedKeys` raw. That skipped first-run seeding, the desired-state
// migration and new-entry seeding all at once — so `--yes` on a machine with no saved selection
// would have proposed removing everything installed on it, and `--yes` after a catalog update
// would have removed the newly added software the user already had. The unattended path is the
// one place where nobody is watching, which makes it the last place that should skip the
// safeguards.
const presentKeys = snapshot
  .filter((s) => s.result.ok && s.result.state !== "unsatisfied")
  .map((s) => s.key);

let previousCatalogKeys = new Set<string>();
try {
  previousCatalogKeys = new Set(
    JSON.parse(await Deno.readTextFile(join(dirname(configPath), "catalog-keys.json"))) as string[],
  );
} catch {
  previousCatalogKeys = new Set(); // absent on a first run, which is not an error
}
const knownKeys = new Set(entries.map(entryKey));
const newlyKnownKeys = previousCatalogKeys.size === 0
  ? []
  : [...knownKeys].filter((k) => !previousCatalogKeys.has(k));

const initialSelection = resolveInitialSelection({
  savedKeys: config.selectedKeys,
  selectionModel: config.selectionModel,
  presentKeys,
  newlyKnownKeys,
});
// Reported, not silently applied: an unattended run that quietly reinterprets the saved selection
// should still say so in its output.
for (const notice of initialSelection.notices) console.error(`note: ${notice}`);
// Deliberately not persisted here. `--dry-run` must touch nothing at all, and an unattended run
// writing a reinterpreted selection back would make a one-off invocation permanent.
const selectedKeys = initialSelection.selection;

// Same real gap as the TUI (see App.tsx's runPlan): a plan needing sudo used to just run its
// scripts and let their own `sudo` calls fail non-interactively, since nothing ever actually
// called `sudo -v` first. Ask once, up front, only when this unattended plan actually needs it.
let keepAlive: ReturnType<typeof startSudoKeepAlive> | undefined;
if (args.mode === "unattended" && Deno.build.os !== "windows") {
  const preview = computePlan(entries, platform, selectedKeys, snapshot, {
    updateKeys: args.includeUpdates
      ? new Set(
        snapshot.filter((s) => s.result.ok && s.result.state === "needs-update").map((s) => s.key),
      )
      : new Set<string>(),
  });
  if (planRequiresElevation(preview.actions)) {
    const granted = await requestSudoAccess(realSudoRunner());
    if (!granted) {
      console.error(
        "Elevated (sudo) access was not granted — this plan needs it for at least one action.",
      );
      Deno.exit(1);
    }
    keepAlive = startSudoKeepAlive(realSudoRunner());
  }
}

let result;
try {
  result = await runCli(args.mode, {
    catalog: entries,
    platform,
    selectedKeys,
    snapshot,
    includeUpdates: args.includeUpdates,
  });
} finally {
  // Same reasoning as the TUI: release the elevation session even if the run throws, rather than
  // leaving a keep-alive timer and a live sudo credential behind.
  if (keepAlive) {
    keepAlive.stop();
    await releaseSudoAccess(realSudoRunner());
  }
  keepAlive = undefined;
}

if (result.kind === "dry-run") {
  console.log(result.renderedPlan);
  Deno.exit(0);
}

const entryByKey = new Map(entries.map((e) => [entryKey(e), e]));
const actionByKey = new Map(result.plan.actions.map((a) => [a.key, a]));
const runId = crypto.randomUUID();
const historyPath = join(dirname(configPath), "history.jsonl");

let hadFailure = false;
for (const r of result.results) {
  const glyph = r.status === "success" ? "✓" : r.status === "failed" ? "✗" : "-";
  console.log(`${glyph} ${r.key}${r.message ? ` — ${r.message}` : ""}`);
  if (r.status === "failed") hadFailure = true;

  const entry = entryByKey.get(r.key);
  const action = actionByKey.get(r.key);
  if (entry === undefined || action === undefined) continue; // every result key comes from plan.actions, so this never actually happens

  const record: HistoryRecord = {
    runId,
    timestamp: new Date().toISOString(),
    key: r.key,
    kind: entry.kind,
    action: action.actionKind,
    result: r.status,
    ...(r.message !== undefined ? { message: r.message } : {}),
  };
  await appendHistoryRecord(historyPath, record);
}

Deno.exit(hadFailure ? 1 : 0);
