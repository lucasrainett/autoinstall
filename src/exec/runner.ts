// Script runner — TASKS.md §1.3. Invokes a catalog entry's operation script and captures its
// result. The shell to run it with is injected (defaults to "bash") rather than hardcoded, so
// this module doesn't need to know about Windows/Git Bash resolution (see git-bash.ts) — that's
// a separate concern that feeds this one an absolute bash.exe path when relevant.

export interface ScriptResult {
  /** null only when the script was killed for timing out. */
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface RunScriptOptions {
  cwd?: string;
  /** Merged with the inherited environment, not a replacement for it. */
  env?: Record<string, string>;
  timeoutMs?: number;
  /** Defaults to "bash". On Windows this should be an absolute path to Git Bash's bash.exe. */
  shell?: string;
  /**
   * Keeps the caller's controlling terminal instead of isolating the script in its own session
   * (see the `setsid` note below). Required for any script that calls `sudo` itself: sudo's
   * credential cache is keyed by terminal (`timestamp_type` defaults to `tty`, falling back to
   * parent-PID when no terminal is present), so a `setsid`-isolated script never matches a
   * credential the main process already cached and fails with "a terminal is required to read the
   * password" — a real, reproduced production failure, see TASKS.md's Terraform investigation.
   *
   * The cost: with no process group to kill, only the direct child (the shell) is killed, so a
   * descendant can survive and keep the output pipe open. The call still returns on time (see the
   * timeout handling below, which deliberately stops waiting on that pipe), so this costs an
   * orphaned process rather than a hung application.
   *
   * A separate process group (keeping the session, so the terminal survives) would let us reap
   * the descendant too, but it would put the script in a *background* process group, where sudo's
   * password prompt takes SIGTTIN and suspends instead of prompting — trading an orphan for a
   * guaranteed hang. Not worth it.
   */
  preserveControllingTerminal?: boolean;
}

/**
 * The script is run so that it becomes its own process-group leader. This matters for the timeout
 * path: a script that backgrounds another process (e.g. `some-daemon &`) leaves that descendant
 * holding the piped stdout/stderr file descriptors open, so killing only the direct child isn't
 * enough — `child.output()` won't resolve until every holder of those descriptors exits, which for
 * a lingering descendant could be much later than the timeout. Killing the whole process group
 * (`kill -SIGKILL -- -<pid>`) closes all of them at once. Confirmed empirically during
 * development: without this, a `sleep 5 &`-style script made a 100ms timeout take the full 5
 * seconds to actually resolve.
 *
 * *How* that group is created is probed rather than assumed, because the obvious assumption was
 * wrong and shipped: this module used to decide with `Deno.build.os !== "windows"`, reading
 * "POSIX" as "has setsid". `setsid` is a util-linux program and **macOS does not ship it**. The
 * result was not a degraded timeout path but total failure — every spawn on macOS threw
 * `NotFound: Failed to spawn 'setsid'`, so every detect, install and remove failed and the tool
 * was non-functional on one of its three supported platforms. Nothing caught it because the suite
 * had only ever run on Linux.
 *
 * The strategies, in preference order:
 *
 *   - `setsid`      — util-linux. Linux, and anywhere else that has it.
 *   - `perl-setsid` — macOS. Perl ships with the OS and exposes the POSIX call directly, so this
 *                     gets the same guarantee rather than giving up on it. `exec` preserves both
 *                     pid and process-group id, so the pid Deno holds is still the group leader
 *                     and `kill -- -<pid>` reaches the whole tree. It falls back to `setpgid(0,0)`
 *                     if `setsid()` reports EPERM (already a group leader), which is enough for
 *                     group-killing even though it keeps the session.
 *   - `direct`      — Windows, or a machine with neither. Plain single-process kill, so a
 *                     backgrounded descendant survives the timeout. A real Windows fix needs Job
 *                     Objects, which Deno's Command API doesn't expose.
 *
 * The cost of `direct` is worth stating precisely, because it is larger than "an orphaned
 * process". Measured against a script that backgrounds `sleep 8` and then hangs, with a 200ms
 * timeout: `runScript` itself returns on time under all three strategies (~210ms), because the
 * timeout handling below deliberately stops waiting on the pipe. But the orphan inherits the piped
 * descriptors, and the *process* cannot exit while it holds them — so the whole application took
 * 8024ms to exit under `direct`, against 237ms under `setsid` and 244ms under `perl-setsid`. The
 * user-visible symptom is not a slow operation but a tool that appears to hang after finishing.
 *
 * Probing rather than branching on the platform name also covers the case that motivated it in the
 * first place: a stripped-down Linux container without util-linux hits exactly the same wall.
 */
type SpawnStrategy = "setsid" | "perl-setsid" | "direct";

/**
 * Isolate, then become the script. Written as one statement per concern so a failure says which
 * part failed: silently continuing without a process group would reintroduce the original bug
 * while looking like it worked.
 */
const PERL_ISOLATE =
  'POSIX::setsid() or POSIX::setpgid(0, 0) or die "cannot isolate process group: $!\\n"; ' +
  'exec @ARGV or die "exec failed: $!\\n";';

let strategyCache: SpawnStrategy | undefined;

/** True when the command exists and runs. Any failure means "not usable", never a throw. */
async function canRun(cmd: string, args: string[]): Promise<boolean> {
  try {
    const { success } = await new Deno.Command(cmd, {
      args,
      stdin: "null",
      stdout: "null",
      stderr: "null",
    }).output();
    return success;
  } catch {
    // NotFound when the binary is absent, NotCapable when --allow-run is scoped narrowly.
    return false;
  }
}

/** Probed once per process: ~170 detect scripts must not each pay for two subprocess probes. */
async function spawnStrategy(): Promise<SpawnStrategy> {
  if (strategyCache !== undefined) return strategyCache;
  if (Deno.build.os === "windows") return (strategyCache = "direct");
  if (await canRun("setsid", ["--version"])) return (strategyCache = "setsid");
  if (await canRun("perl", ["-MPOSIX", "-e", "exit 0"])) return (strategyCache = "perl-setsid");
  return (strategyCache = "direct");
}

export async function runScript(
  scriptPath: string,
  options: RunScriptOptions = {},
): Promise<ScriptResult> {
  const shell = options.shell ?? "bash";
  // preserveControllingTerminal deliberately opts out of isolation entirely — see the option's
  // own documentation for why sudo needs the terminal.
  const strategy: SpawnStrategy = options.preserveControllingTerminal === true
    ? "direct"
    : await spawnStrategy();
  const useProcessGroup = strategy !== "direct";
  // A script that does not need the terminal must not be given it. Deno's default is to *inherit*
  // stdin, so every spawned script held the same tty the interface reads keys from and swallowed
  // whatever the user typed while it ran. With ~80 detect scripts running back to back at startup
  // and after every run, that made the whole interface unresponsive for the length of a scan —
  // keys pressed during it simply vanished. Verified by pressing "n" mid-scan and watching the
  // notices screen fail to open.
  //
  // The exception is a script keeping the controlling terminal on purpose: `sudo` reads the
  // password from stdin, so denying it there would break elevation entirely.
  const stdin = options.preserveControllingTerminal === true ? "inherit" : "null";
  // Homebrew asks "Do you want to proceed with the installation?" and waits, and with stdin closed
  // nothing can answer it. On a runner that shows up as an install producing its whole successful
  // output — "freeplane was successfully installed!" — and then never exiting, until the ten-minute
  // cap kills it. HOMEBREW_NO_ASK answers the confirmation; the other two stop brew wandering off
  // to update itself or a cask mid-install, which is slow and can prompt in its own right.
  //
  // Set here rather than in each of the 59 scripts that call brew: it is a property of running a
  // script without a terminal, which is this runner's decision, not the entry's.
  const env = {
    HOMEBREW_NO_ASK: "1",
    HOMEBREW_NO_AUTO_UPDATE: "1",
    HOMEBREW_NO_INSTALL_UPGRADE: "1",
    ...options.env,
  };
  const shared = {
    cwd: options.cwd,
    env,
    stdin,
    stdout: "piped",
    stderr: "piped",
  } as const;
  const command = strategy === "setsid"
    ? new Deno.Command("setsid", { args: [shell, scriptPath], ...shared })
    : strategy === "perl-setsid"
    ? new Deno.Command("perl", {
      args: ["-MPOSIX", "-e", PERL_ISOLATE, shell, scriptPath],
      ...shared,
    })
    : new Deno.Command(shell, { args: [scriptPath], ...shared });

  const child = command.spawn();

  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutSignal = options.timeoutMs !== undefined
    ? new Promise<"timeout">((resolve) => {
      timer = setTimeout(async () => {
        timedOut = true;
        try {
          // Only group-kill when this run actually created its own process group (via setsid).
          // Without that, `child.pid` is not a group leader and `kill -- -<pid>` would signal
          // whatever unrelated group happens to carry that id — including, potentially, this
          // process's own.
          if (useProcessGroup) {
            await new Deno.Command("kill", { args: ["-SIGKILL", "--", `-${child.pid}`] }).output();
          } else {
            child.kill("SIGKILL");
          }
        } catch {
          // process (group) may have already exited between the timer firing and this call
        }
        resolve("timeout");
      }, options.timeoutMs);
    })
    : undefined;

  const outputPromise = child.output();
  // Swallow a late rejection from the abandoned promise below, so bailing out on timeout can't
  // surface as an unhandled rejection (which, under Ink's raw mode, kills the process outright).
  outputPromise.catch(() => {});

  if (timeoutSignal !== undefined) {
    await Promise.race([outputPromise, timeoutSignal]);
  }

  if (timedOut) {
    // Deliberately do NOT await the output promise here. It only resolves once every holder of
    // the piped stdout/stderr has exited, so a descendant that survived the kill (see
    // preserveControllingTerminal, which has no process group to kill) would block this call
    // forever — turning a bounded timeout into a permanent hang of the whole app. Returning now
    // keeps the timeout an actual guarantee; the orphaned descendant is reported, not waited on.
    if (timer !== undefined) clearTimeout(timer);
    return { exitCode: null, stdout: "", stderr: "", timedOut: true };
  }

  const output = await outputPromise; // safe to await again after the race: same promise
  if (timer !== undefined) clearTimeout(timer);

  return {
    exitCode: output.code,
    stdout: new TextDecoder().decode(output.stdout),
    stderr: new TextDecoder().decode(output.stderr),
    timedOut: false,
  };
}
