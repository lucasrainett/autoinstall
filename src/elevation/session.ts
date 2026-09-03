// Real sudo session lifecycle — PROJECT_DEFINITION.md §15: ask once, only when the confirmed plan
// actually needs it, keep the credential alive for the run, release it at the end. This is the
// piece that turns the already-built planRequiresElevation + startKeepAlive into a real sudo
// prompt: neither of those two ever actually called `sudo`, which is exactly the gap that let a
// real elevated install (Terraform's `apt install`, run via setsid — see exec/runner.ts) fail
// with "sudo: a password is required" instead of ever asking for one.
//
// SudoRunner is injected so tests never spawn a real `sudo`; realSudoRunner() is the actual
// implementation, wired in only at the TUI/CLI entry points that own a real terminal.

import { type KeepAliveHandle, startKeepAlive } from "./keep-alive.ts";

export type SudoRunner = (args: readonly string[]) => Promise<boolean>;

/** Runs a real `sudo` subcommand with fully inherited stdio, so `-v`'s password prompt (when the
 * credential cache doesn't already cover this run) is genuinely interactive — not piped, not
 * captured. Only call this while nothing else is also reading the same terminal (e.g. an Ink app
 * still in raw mode) — see App.tsx's use of Ink's own `suspendTerminal` for how the TUI avoids
 * that race. */
export function realSudoRunner(): SudoRunner {
  return async (args) => {
    try {
      const { code } = await new Deno.Command("sudo", {
        args: [...args],
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      }).output();
      return code === 0;
    } catch {
      return false;
    }
  };
}

/** `sudo -v`: prompts once (if the credential cache doesn't already cover this run) and caches
 * the result. A `false` return means the plan's elevated actions cannot run — the caller should
 * not proceed to execute them. */
export function requestSudoAccess(runSudo: SudoRunner): Promise<boolean> {
  return runSudo(["-v"]);
}

/** `sudo -n true` on a timer — the same "prove the credential is still fresh" loop the old
 * `script.sh` already used, generalized via the existing `startKeepAlive`. A failed refresh is
 * ignored here rather than thrown: a lapsed credential just means the *next* elevated script's
 * own `sudo` call re-prompts (interactively) or fails (unattended), not that this loop should
 * abort the whole run over it. */
export function startSudoKeepAlive(runSudo: SudoRunner, intervalMs = 60_000): KeepAliveHandle {
  return startKeepAlive(() => {
    runSudo(["-n", "true"]).catch(() => {});
  }, intervalMs);
}

/** `sudo -k`: invalidates the cached credential at the end of a run, per §15 ("released at the
 * end, never asked upfront just in case"). Best-effort — a failure here isn't worth surfacing. */
export async function releaseSudoAccess(runSudo: SudoRunner): Promise<void> {
  await runSudo(["-k"]).catch(() => {});
}
