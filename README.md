# autoinstall

A cross-platform machine setup tool for macOS, Debian/Ubuntu Linux and Windows. It installs
software and applies privacy, security and quality-of-life configuration through one reviewable,
interactive process — and it shows you exactly what it will do before it does anything.

Nothing runs until you confirm a plan.

## What it looks like

Pick what you want from a searchable list grouped by category. Categories are rows in their own right —
move onto `browsers` and press space to select every browser. `[~]` means a category is partly
selected. Only software that exists on your platform is listed. Anything already installed shows a
**bold**, so what Enter is about to do is visible before you press it; the footer also shows how
many are pending, and the **Plan pane is on screen the whole time** so you can see exactly what a
run would do while you are still choosing. There is deliberately no "installed" tick — a checked box that is *not* bold
already means it is there, and an unchecked box that *is* bold means it is about to be removed.
What the row cannot tell you it still shows: ⏫ for an available update, ❌ for something that
failed in the last run, and ❓ when the check itself did not work. The bar down the right of the list is
a real scrollbar — the thumb's length is the share of the catalog currently on screen, so how much
more there is shows at a glance. Press Enter to review the plan, then confirm.

```
┌──────────────────────────────────────┐┌────────────────────────────┐
│ 📚 Catalog                          ┃││ 📋 Details                 │
│ / (press / to search)  [1 of 125]    ┃││ Git                        │
│ 🟨 🔧 dev-tools                      ┃││ Distributed version control│
│   ✅ Git                            ┃││ https://git-scm.com        │
│   ⬜ GitHub CLI                     │││ ● Installed · selected     │
│   ✅ jq                             │└────────────────────────────┘
│   ⬜ Docker                         │┌────────────────────────────┐
│   ⬜ Go                             ││ 📋 Plan (2)                │
│ ⬜ 🎮 gaming                        ││ The following 2 action(s)  │
│   ⬜ Steam                          ││   install   Docker         │
│   ⬜ Lutris                         ││   remove    Brave          │
└──────────────────────────────────────┘└────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────┐
│ ⚡ Status                                                             │
│ ↑↓ move · space select · / search · p profiles · ? help · Enter apply │
│ ready — 125 entries diagnosed                                          │
└──────────────────────────────────────────────────────────────────────┘
```

## The one idea worth knowing

**A checked box means "this should be on my machine."** It is not a queue of actions.

- Checked but missing → it gets installed.
- Unchecked but present → it gets removed.
- Already as you want it → nothing happens.

Where one program has two genuinely different Linux packagings, it appears as two entries —
`Steam (deb)` and `Steam (Flatpak)`, and likewise VSCodium and Signal. They are separate because
both can be installed at once, and one entry could not express *"remove the Flatpak, keep the
deb"*. Each detects, installs and removes only its own packaging. On macOS and Windows, where
there is only one way to install these, a single entry covers it.

Software that is installed but out of date counts as *already as you want it* — it is on your
machine, which is what the checkbox asserts. A checkbox is binary, so it cannot also mean "and
bring this up to date": updates are marked separately, per entry, with `u` (or `U` for all of
them). Nothing is updated unless you asked for it.

The plan lists only what will change. Entries that need no action are not shown at all.

That is why preinstalled software you never asked for (GarageBand, the Xbox app, Rhythmbox)
appears already checked: it *is* on your machine. Uncheck it to get rid of it.

On a first run everything currently installed starts checked, so the tool never proposes removing
something just because you have not told it you want that yet.

## Install

Linux and macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/lucasrainett/autoinstall/master/install | bash
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/lucasrainett/autoinstall/master/install.ps1 | iex
```

That downloads the binary for your machine, checks it against the release's `SHA256SUMS` and
refuses to install anything that does not match, then puts it on your PATH. It installs the tool
and stops — nothing is inspected or changed until you run it. There is no runtime to install: the
binary is self-contained.

Then:

```bash
autoinstall              # the interactive interface
autoinstall --dry-run    # print the plan and exit, touching nothing
autoinstall --yes        # apply your saved selection without prompting
autoinstall --yes --with-updates   # ...and update anything that has an update
```

On Windows you also need [Git for Windows](https://git-scm.com/download/win) — every catalog
script runs through Git Bash. The installer says so if it is missing.

<details>
<summary>Installing a pre-release (beta)</summary>

A pre-release is deliberately **not** what `latest` resolves to — GitHub's `releases/latest`
skips them, so a beta only reaches people who ask for it by tag:

```bash
curl -fsSL https://raw.githubusercontent.com/lucasrainett/autoinstall/master/install | VERSION=v0.1.0-beta.1 bash
```

Note where `VERSION` goes. In `VERSION=… curl … | bash` the assignment applies to **curl**, which
does not read it, so the script falls back to `latest` and cannot find a pre-release.
```powershell
$env:VERSION = 'v0.1.0-beta.1'
irm https://raw.githubusercontent.com/lucasrainett/autoinstall/master/install.ps1 | iex
```

Beta binaries are **not code-signed**, so both platforms will object the first time:

- **macOS** — Gatekeeper refuses an unsigned binary. Allow this one:
  `xattr -d com.apple.quarantine ~/.autoinstall/bin/autoinstall`
- **Windows** — SmartScreen shows "Windows protected your PC". Choose *More info* → *Run anyway*.

Both warnings are correct: nobody has vouched for these binaries. The installer still verifies the
download against the release's `SHA256SUMS` and refuses anything that does not match, which proves
the file is the one that was published — not who published it.

</details>

<details>
<summary>Other ways to install</summary>

Pick a version, or install somewhere else:

```bash
curl -fsSL .../install | VERSION=v0.2.0 bash          # a specific release
curl -fsSL .../install | AUTOINSTALL_INSTALL_DIR=~/bin bash
curl -fsSL .../install | bash -s -- --no-modify-path  # leave shell profiles alone
```

From source, which needs [Deno](https://deno.com/):

```bash
git clone https://github.com/lucasrainett/autoinstall.git
cd autoinstall
deno task start            # run it
deno task compile          # or build a binary → dist/autoinstall
```

</details>

## Keys

| Key | Does |
| --- | --- |
| `↑` `↓` | move |
| `space` | select / deselect — on a category row, the whole category |
| `a` | select everything matching the current filter |
| `c` | check / uncheck the whole category, from anywhere inside it (or click its header) |
| `/` | search — matches names, descriptions, every category an entry belongs to, and its capability keys (`link-routing`, `video-editing`), so you can search for what you want to *do* |
| `p` | profiles — apply a bundle of entries |
| `h` | history of previous runs |
| `n` | notices: startup checks, warnings and conflicts |
| `o` | open the installed app under the cursor — it keeps running after you quit |
| `u` | mark the entry under the cursor for update (only if it shows ↑) |
| `U` | mark every selected entry that has an update |
| `e` / `i` | export / import your selection as a manifest |
| `r` | after a run that failed: report it on GitHub, with the error attached and your paths, hostname and credentials removed |
| `?` | full help |
| `Enter` | review the plan, then apply |
| `ctrl+c` | quit |

There is deliberately no "deselect all": with desired-state selection, one keystroke would queue
the removal of everything on screen.

## What's in the catalog

**184 entries** across 13 categories — browsers, communication, dev-tools, media, gaming, creative,
productivity, security, privacy, system-utilities, AI, 3D printing and quality-of-life.
Platform coverage is 125 Linux, 82 macOS, 112 Windows; an entry simply has no folder for a platform
where the software does not exist, which is how "not applicable here" is expressed.

**Six profiles** — `developer`, `privacy`, `minimal`, `infrastructure`, `gaming`, `creative` —
are named bundles you can apply in one step. Applying a profile only ever adds to your selection;
it never silently unchecks something you chose.

## How it decides what to do

Every entry is a directory of plain shell scripts, one per operation:

```
catalog/git/
├── meta.toml            name, description, capabilities, per-platform install method and notes
├── linux/{detect,install,remove}.sh
├── macos/{detect,install,remove}.sh
└── windows/{detect,install,remove}.sh
```

`detect.sh` reports the truth about the machine using exit codes — `0` installed and current,
`1` not installed, `2` update available. Everything else follows from that: the interface shows
the state, and the planner works out the difference between what is there and what you asked for.

Scripts are deliberately ordinary files with no framework around them, so any single operation can
be read, and run, by hand:

```bash
bash catalog/git/linux/detect.sh; echo $?
```

## Safety

The tool runs installers, and some of them need `sudo`. What it will not do:

- **Run anything before you confirm.** The plan lists every action, flags the destructive ones,
  and says which need elevated access.
- **Ask for `sudo` it does not need.** Elevation is requested once, only when the confirmed plan
  contains an action that requires it, and released afterwards.
- **Remove software as collateral.** If uninstalling something would drag unrelated packages out
  with it, the removal is skipped and reported rather than performed.
- **Overwrite what is yours.** Entries write to their own paths and marked config blocks. Your
  `.bashrc`, `.gitconfig`, SSH keys and documents are not rewritten or deleted.
- **Hide failures.** A failed step is reported with its actual error, recorded in the run history,
  added to the notices screen, and marked with a red ✗ on the entry itself. It never blocks the
  remaining steps. The checkbox stays checked, because a failure does not change the fact that you
  want the software — the next run tries again.

## Making it yours

Configuration lives in `~/.config/autoinstall/config.toml` (`%APPDATA%` on Windows) and holds your
identity, your remembered selection, and any overlay repositories.

An **overlay repository** is your own git repo with the same `catalog/` and `profiles/` layout.
Point the tool at it and your entries and profiles are merged on top of the bundled ones, so you
can add private software or override how a bundled entry behaves without forking this project.

Nothing personal is hardcoded in the catalog. Entries that need your name or email (git identity,
for example) receive it from your config at run time.

## Project documents

- [`PROJECT_DEFINITION.md`](PROJECT_DEFINITION.md) — what the tool does, without implementation detail.
- [`PLATFORM_EQUIVALENTS.md`](PLATFORM_EQUIVALENTS.md) — software mapped across the three platforms, with sources.
- [`TASKS.md`](TASKS.md) — the build plan, current status, and an honest record of what is and is not verified.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the engine fits together, and why the odd-looking decisions are that way.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to add a catalog entry or profile.
- [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) — every failure that has actually happened, and what to do about it.
- [`SECURITY.md`](SECURITY.md) — reporting a concern in a tool that runs with elevated privileges.

## Status

The engine, the interface and the catalog are working and used. Honest gaps, kept current in
`TASKS.md`:

- **macOS and Windows catalog entries have never been executed** — they are verified against
  package registries and vendor documentation, not by running them. This is the largest gap in
  the project. The workflow that would close it (`catalog-lifecycle.yml`, a full
  install/re-install/remove on real runners) is written but has not run yet.
- The **engine** underneath them *is* verified on all three platforms: CI runs the type-check and
  the full unit suite on Linux, macOS and Windows on every push, plus a Windows job that exercises
  the Git Bash bridge the Windows entries drive `winget`, `powershell.exe` and `reg.exe` through.
  This is worth stating because the first such run found the tool was completely non-functional on
  macOS — it shelled out to `setsid`, which is util-linux and does not exist there, so every
  install, removal and detection failed. Nothing had caught it in months of Linux-only testing.
- Entries needing a real init system (Docker, Proton VPN, the firewall, Thunderbird's snap)
  cannot be verified in the Linux container harness and need a VM.
- **Binaries are not code-signed**, so macOS Gatekeeper and Windows SmartScreen will warn. The
  installers verify SHA256 checksums and refuse an unverified download, which is a
  different guarantee: it proves the file matches the release, not who built it.

```bash
deno task test
deno task check   # type-check
deno task lint
```
