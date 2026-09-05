# Architecture

How the pieces fit together, and why a few of the odd-looking decisions are the way they are.

## The shape of it

```
catalog/  ── shell scripts, one directory per entry ── the thing that actually changes your machine
   │
src/      ── decides *what* to run; never contains a package name or a command
   │
main.tsx  ── wires real I/O (disk, terminal, subprocesses) to the engine
```

The engine knows nothing about apt, brew, winget or flatpak. It knows that an entry has a
`detect.sh` that reports state through exit codes, and scripts it can run. Adding software is
therefore never a code change.

## Modules

Rounded, so they stay true as the code moves; the ordering is the point, not the digits.

| Area | Lines | What it owns |
| --- | --- | --- |
| `tui/` | ~2100 | The interface: list, screens, input, layout, terminal restoration |
| `startup/` | ~400 | Boot sequence — pre-flight, overlay sync, catalog merge, asset extraction |
| `exec/` | ~350 | Running scripts: timeouts, process groups, script environment |
| `catalog/` | ~350 | Loading and validating entries from disk |
| `overlay/` | ~300 | Cloning and merging personal catalogs |
| `platform/` | ~200 | OS, package manager and WSL detection |
| `plan/` | ~190 | Turning selection + live state into an ordered list of actions |
| `config/`, `profiles/`, `history/`, `manifest/`, `update/`, `diagnostics/`, `elevation/`, `schema/`, `cli/` | ~950 | State, persistence and policy |

## The two ideas that shape everything

**1. `detect.sh` exit codes are the only source of truth.** `0` installed and current, `1` absent,
`2` update available. The interface shows it, the planner acts on it. No state is cached between
runs and inferred later — the machine is asked every time.

**2. Selection is desired state.** `computePlan` compares what you selected against what is
actually there and plans both directions: install what is checked and missing, remove what is
unchecked and present. This is why there is no "deselect all" key — one keystroke would queue the
removal of everything visible.

## Flow of a run

```
detect OS ─► pre-flight (internet, disk) ─► load catalog ─► merge overlay repos
     ─► restore saved selection (or seed from live state on a first run)
     ─► run every detect.sh  ─► render the list
     ─► [Enter] computePlan ─► review screen ─► [y]
     ─► request sudo once, only if the plan needs it
     ─► run each action ─► write history ─► release sudo ─► re-scan
```

Elevation is acquired once for the whole run and released in a `finally`, so a failure mid-run
cannot leave a live credential and a refresh timer behind.

## Decisions that look strange, and why

**Every operation is a separate script file, and the duplication is deliberate.** Twenty-six winget
entries contain nearly the same three lines. Factoring that into a shared helper would break the
property that any single operation can be copied to a machine and run by hand — which is how most
bugs in this project were actually diagnosed — and would couple overlay repos to the core
catalog's internal layout. A test asserts the duplicated blocks have not drifted, which buys back
the only real cost.

**The terminal size is polled, not observed.** Neither Ink's resize hook nor `SIGWINCH` fires once
Ink holds stdin in raw mode. Both were tested in isolation; both work before raw mode and never
after. Polling `Deno.consoleSize()` every 250 ms is the version that works.

**Elevated scripts keep the controlling terminal; everything else runs in its own process group.**
`sudo`'s credential cache is keyed by terminal, so a session-isolated script can never match the
credential acquired up front and fails with "a terminal is required to read the password". The
cost is that elevated scripts have no process group to kill on timeout, so the call returns on time
but may leave an orphan.

*How* that process group is created is probed at run time, not decided by platform. `setsid` is a
util-linux program and does not exist on macOS; assuming "not Windows" meant "has setsid" made the
tool throw on every single spawn there, so every install, removal and detection failed. macOS uses
Perl's `POSIX::setsid` instead, which ships with the OS and — since `exec` preserves both pid and
process-group id — gives the identical guarantee. Windows has neither and falls back to a
single-process kill, where an orphan holding the output pipe delays process *exit*: measured at
8024 ms against 237 ms, so the symptom is a tool that appears to hang after finishing.

**The compiled binary extracts the catalog on startup.** `deno compile --include` embeds files in a
virtual filesystem readable only by the binary's own Deno APIs — a spawned `bash` cannot see them,
which silently broke every detect. Extraction to a real directory keeps both "ship one binary" and
"scripts are real files".

**Async work started from effects and key handlers goes through a `guard` helper.** An unhandled
rejection while Ink holds raw mode kills the process without restoring the terminal. The helper
routes failures to the status line and notices screen instead.

## Testing

Unit tests cover pure logic; anything touching real OS state is verified by running it in a
disposable container and recording what happened. Two habits matter more than coverage:

- **Check reachability.** Several fully-tested modules once sat wired to nothing. A unit test
  imports the module directly, which is exactly what the app was failing to do.
- **Make the test fail on purpose once.** Tests here have passed for the wrong reason repeatedly —
  a fixture missing a field, an extraction anchored on the wrong string, a rule scoped too broadly.
