// CLI argument parsing — TASKS.md §2 ("Unattended and dry-run CLI modes that bypass the TUI
// entirely"). Pure, so no real process.argv/Deno.args plumbing is needed to test it.

export type CliMode = "tui" | "dry-run" | "unattended";

export interface CliArgs {
  mode: CliMode;
  /** `--with-updates`: fold available updates into the plan. Off by default so an unattended run
   * does exactly what the saved selection asks for and nothing more. */
  includeUpdates: boolean;
}

/**
 * `--dry-run` always wins over `--yes` if both are given, regardless of order — a dry-run request
 * must never be silently overridden into actually running scripts just because `--yes` was also
 * present. No flags at all means the interactive TUI.
 */
export function parseCliArgs(argv: readonly string[]): CliArgs {
  const includeUpdates = argv.includes("--with-updates");
  if (argv.includes("--dry-run")) return { mode: "dry-run", includeUpdates };
  if (argv.includes("--yes")) return { mode: "unattended", includeUpdates };
  return { mode: "tui", includeUpdates };
}
