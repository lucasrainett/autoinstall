/**
 * Real (not unit-testable in isolation) check for whether a command exists on PATH: try to spawn
 * it with no arguments and no stdin, and treat a successful spawn — regardless of its exit code —
 * as "exists"; only a spawn-time NotFound error means it doesn't. Consumers should depend on this
 * via injection (see package-managers.ts, wsl.ts) so their own decision logic stays pure and testable.
 */
export async function commandExists(cmd: string): Promise<boolean> {
  try {
    const command = new Deno.Command(cmd, {
      args: [],
      stdin: "null",
      stdout: "null",
      stderr: "null",
    });
    const child = command.spawn();
    await child.status;
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return false;
    // Some other spawn-time failure (e.g. permission denied) — treat conservatively as unusable.
    return false;
  }
}
