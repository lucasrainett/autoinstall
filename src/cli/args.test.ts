import { assertEquals } from "@std/assert";
import { HELP_TEXT, parseCliArgs } from "./args.ts";

Deno.test("parseCliArgs - no recognized flags means the interactive TUI", () => {
  assertEquals(parseCliArgs([]), { mode: "tui", includeUpdates: false });
  assertEquals(parseCliArgs(["--verbose"]), { mode: "tui", includeUpdates: false });
});

Deno.test("parseCliArgs - --dry-run selects dry-run mode", () => {
  assertEquals(parseCliArgs(["--dry-run"]), { mode: "dry-run", includeUpdates: false });
});

Deno.test("parseCliArgs - --yes selects unattended mode", () => {
  assertEquals(parseCliArgs(["--yes"]), { mode: "unattended", includeUpdates: false });
});

Deno.test("parseCliArgs - --dry-run wins over --yes regardless of argument order", () => {
  assertEquals(parseCliArgs(["--yes", "--dry-run"]), { mode: "dry-run", includeUpdates: false });
  assertEquals(parseCliArgs(["--dry-run", "--yes"]), { mode: "dry-run", includeUpdates: false });
});

Deno.test("parseCliArgs - unrelated flags alongside a recognized one don't interfere", () => {
  assertEquals(parseCliArgs(["--verbose", "--yes", "--profile=developer"]), {
    mode: "unattended",
    includeUpdates: false,
  });
});

Deno.test("parseCliArgs - --with-updates opts into folding available updates into the plan", () => {
  // Off by default in every mode: an unattended run should do what the saved selection asks and
  // nothing more, which is the same rule the interactive plan follows.
  assertEquals(parseCliArgs(["--yes", "--with-updates"]), {
    mode: "unattended",
    includeUpdates: true,
  });
  assertEquals(parseCliArgs(["--dry-run", "--with-updates"]), {
    mode: "dry-run",
    includeUpdates: true,
  });
  assertEquals(parseCliArgs(["--yes"]).includeUpdates, false);
});

Deno.test("parseCliArgs - --version and --help are recognised, and print-only", () => {
  // Found by running a real release binary: --version was unrecognised, fell through to the
  // interactive mode, and died with "Raw mode is not supported" — while the issue template asks
  // reporters to run exactly that command.
  assertEquals(parseCliArgs(["--version"]).mode, "version");
  assertEquals(parseCliArgs(["-V"]).mode, "version");
  assertEquals(parseCliArgs(["--help"]).mode, "help");
  assertEquals(parseCliArgs(["-h"]).mode, "help");
});

Deno.test("parseCliArgs - printing wins over anything that would touch the machine", () => {
  // Order must not matter: asking for the version alongside --yes must never run a plan.
  assertEquals(parseCliArgs(["--yes", "--version"]).mode, "version");
  assertEquals(parseCliArgs(["--version", "--yes"]).mode, "version");
  assertEquals(parseCliArgs(["--dry-run", "--help"]).mode, "help");
});

Deno.test("parseCliArgs - no flags still means the interactive interface", () => {
  assertEquals(parseCliArgs([]).mode, "tui");
});

Deno.test("HELP_TEXT - documents every mode the parser accepts", () => {
  // A help text that omits a flag is worse than none: it implies the flag does not exist.
  for (const flag of ["--dry-run", "--yes", "--with-updates", "--version", "--help"]) {
    assertEquals(HELP_TEXT.includes(flag), true, `help does not mention ${flag}`);
  }
});
