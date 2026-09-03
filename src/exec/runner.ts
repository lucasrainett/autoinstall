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
 * On POSIX (Linux/macOS), the script is run under `setsid` so it becomes its own process-group
 * leader. This matters for the timeout path: a script that backgrounds another process (e.g.
 * `some-daemon &`) leaves that descendant holding the piped stdout/stderr file descriptors open,
 * so killing only the direct child isn't enough — `child.output()` won't resolve until every
 * holder of those descriptors exits, which for a lingering descendant could be much later than
 * the timeout. Killing the whole process group (`kill -SIGKILL -- -<pid>`) closes all of them at
 * once. Confirmed empirically during development: without this, a `sleep 5 &`-style script made
 * a 100ms timeout take the full 5 seconds to actually resolve.
 *
 * Windows has no equivalent here — this fallback path does a plain single-process kill, which has
 * the same "lingering descendant" gap. A real fix needs Windows Job Objects, which Deno's Command
 * API doesn't expose; flagged as a known limitation for Phase 7 rather than silently assumed fixed.
 */
const usesProcessGroups = Deno.build.os !== "windows";

export async function runScript(
  scriptPath: string,
  options: RunScriptOptions = {},
): Promise<ScriptResult> {
  const shell = options.shell ?? "bash";
  const useSetsid = usesProcessGroups && options.preserveControllingTerminal !== true;
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
  const command = useSetsid
    ? new Deno.Command("setsid", {
      args: [shell, scriptPath],
      cwd: options.cwd,
      env: options.env,
      stdin,
      stdout: "piped",
      stderr: "piped",
    })
    : new Deno.Command(shell, {
      args: [scriptPath],
      cwd: options.cwd,
      env: options.env,
      stdin,
      stdout: "piped",
      stderr: "piped",
    });

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
          if (useSetsid) {
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
