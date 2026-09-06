// Starts an installed application and gets out of the way.
//
// Deliberately not built on runScript, which exists to *supervise* a script: it pipes the output,
// waits for exit, and enforces a timeout. All three are wrong here. A launched app runs for as
// long as the user wants it, produces output nobody is reading, and must outlive the tool — if
// quitting autoinstall killed the editor you just launched from it, the feature would be a trap.
//
// So this spawns detached, discards the streams, and never awaits the child. The only thing it
// waits for is the spawn itself, so a missing binary is still reported rather than silently
// swallowed.

/** Injected so tests never spawn anything real. */
export interface LaunchedChild {
  status: Promise<{ success: boolean; code: number }>;
  stderr: ReadableStream<Uint8Array>;
  unref(): void;
  kill(signal?: Deno.Signal): void;
}

export type LaunchSpawn = (cmd: string, args: string[]) => LaunchedChild;

const defaultSpawn: LaunchSpawn = (cmd, args) =>
  new Deno.Command(cmd, {
    args,
    stdin: "null",
    // stdout is discarded, but stderr is kept: it is the only place the reason for an immediate
    // failure appears, and discarding it is what made a broken launch report success.
    stdout: "null",
    stderr: "piped",
  }).spawn() as unknown as LaunchedChild;

export type LaunchResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * How long to watch a freshly started app before assuming it is running.
 *
 * An app that is going to fail on startup does so almost immediately — a missing runtime, the
 * wrong flatpak installation, a broken desktop file. Anything still alive after this is treated as
 * launched and detached. Long enough to catch those, short enough that the interface does not feel
 * stuck while a real app starts.
 */
export const LAUNCH_GRACE_MS = 1500;

/** Reads at most `limit` bytes, then stops. Bounded so a chatty app cannot grow this without end,
 * and drained rather than ignored so a full stderr pipe can never block the app itself. */
async function readSome(stream: ReadableStream<Uint8Array>, limit = 2000): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < limit) {
      const { done, value } = await reader.read();
      if (done || value === undefined) break;
      chunks.push(value);
      total += value.length;
    }
  } catch {
    // Stream closed under us — whatever was collected is still worth reporting.
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(
    chunks.reduce((acc, c) => {
      const next = new Uint8Array(acc.length + c.length);
      next.set(acc);
      next.set(c, acc.length);
      return next;
    }, new Uint8Array()),
  ).trim();
}

/**
 * Starts the app, detached, and reports a failure it can actually see.
 *
 * Previously this returned success as soon as the *spawn* worked, which is nearly always — the
 * shell starts fine and then the command inside it fails. The interface said "Started GIMP" while
 * nothing opened. Now an app that dies within the grace period is reported with its own stderr.
 *
 * `unref()` is what makes a surviving child independent of this process: without it Deno keeps the
 * event loop alive waiting for a child that may run for hours, so quitting the tool would appear
 * to hang and then take the app down with it.
 */
export async function launchApp(
  scriptPath: string,
  shell = "bash",
  spawn: LaunchSpawn = defaultSpawn,
  graceMs: number = LAUNCH_GRACE_MS,
): Promise<LaunchResult> {
  let child: LaunchedChild;
  try {
    child = spawn(shell, [scriptPath]);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const errText = readSome(child.stderr);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stillRunning = Symbol("running");
  const raced = await Promise.race([
    child.status.catch(() => ({ success: false, code: -1 })),
    new Promise<typeof stillRunning>((resolve) => {
      timer = setTimeout(() => resolve(stillRunning), graceMs);
    }),
  ]);
  if (timer !== undefined) clearTimeout(timer);

  if (raced !== stillRunning && !raced.success) {
    const detail = await errText;
    return {
      ok: false,
      error: detail.length > 0
        ? detail.split("\n")[0]
        : `exited immediately with code ${raced.code}`,
    };
  }

  // Survived the grace period: it is running, and this process must stop caring about it.
  child.unref();
  return { ok: true };
}

/** The run script for an entry on this platform, when it has one. */
export function appRunScript(
  platforms: Partial<Record<string, { run?: string }>>,
  platform: string | undefined,
): string | undefined {
  if (platform === undefined) return undefined;
  return platforms[platform]?.run;
}
