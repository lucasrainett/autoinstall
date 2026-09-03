import { assertEquals } from "@std/assert";
import { parseCliArgs } from "./args.ts";

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
