// CLI argument parsing — TASKS.md §2 ("Unattended and dry-run CLI modes that bypass the TUI
// entirely"). Pure, so no real process.argv/Deno.args plumbing is needed to test it.

export type CliMode = "tui" | "dry-run" | "unattended" | "version" | "help";

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
  // Checked before every other mode: these only print. Found by running a real release binary —
  // `--version` was unrecognised and fell through to launching the interface, which then failed
  // with "Raw mode is not supported" on any non-terminal. The issue template asks reporters for
  // `autoinstall --version`, so the one command we tell people to run did not exist.
  if (argv.includes("--version") || argv.includes("-V")) return { mode: "version", includeUpdates };
  if (argv.includes("--help") || argv.includes("-h")) return { mode: "help", includeUpdates };
  if (argv.includes("--dry-run")) return { mode: "dry-run", includeUpdates };
  if (argv.includes("--yes")) return { mode: "unattended", includeUpdates };
  return { mode: "tui", includeUpdates };
}

/** The text `--help` prints. Kept here so it is testable and cannot drift from the parser. */
export const HELP_TEXT = `autoinstall — set up a machine from a catalog of software and settings

Usage:
  autoinstall                     the interactive interface
  autoinstall --dry-run           print the plan and exit, touching nothing
  autoinstall --yes               apply your saved selection without prompting
  autoinstall --version           print the version and exit

Options:
  --with-updates                  include available updates in the plan
  -h, --help                      show this
  -V, --version                   show the version

Nothing is applied until you review the plan and confirm it.`;
