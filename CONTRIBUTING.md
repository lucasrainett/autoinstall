# Contributing

Most contributions are catalog entries — a new piece of software, or a configuration option. That
is deliberately the easiest thing to add: it is a directory of shell scripts, not a code change.

## Adding a catalog entry

```
catalog/<category>/install/<id>/
├── meta.toml
├── linux/{detect,install,remove}.sh
├── macos/{detect,install,remove}.sh
└── windows/{detect,install,remove}.sh
```

Create a folder only for the platforms where the software genuinely exists. **A missing platform
folder is how "not applicable here" is expressed** — do not add one that prints "unsupported".

`meta.toml`:

```toml
name = "Example"
description = "One sentence on what it is, not what it is not"
website = "https://example.com/"

[linux]
installMethod = "flatpak"
notes = "Only for behaviour beyond the plain install — a required override, a two-step setup."
requiresElevation = true
```

`installMethod` is a closed set: `flatpak`, `apt`, `deb`, `homebrew`, `winget`, `appimage`,
`script`, `direct-download`.

### The exit-code contract

`detect.sh` is the most important script. It answers "what is true on this machine right now":

| Exit | Meaning |
| --- | --- |
| `0` | installed and current |
| `1` | not installed |
| `2` | an update is available |

Everything else follows from this — the status shown in the list, whether an action is planned,
and whether an update can be offered at all. An entry whose detect can never return `2` can never
be updated by the tool.

Two rules the test suite enforces:

- **`detect.sh` must not use `sudo`.** The startup scan runs every detect script before any
  elevation is requested, so a `sudo` call fails for want of a cached credential and reports an
  installed entry as missing. Read a world-readable file or query the package manager instead.
- **Package-manager entries must implement the exit-2 path**, so updates work.

### What good scripts do

- **Be honest about state.** Compare against the thing you actually manage. Checking "is *any*
  git identity set" is wrong; checking whether it matches the configured one is right.
- **Survive a re-run.** Every script runs repeatedly. Anything that can prompt is a bug —
  `apt` needs `-y`, `gpg --dearmor` needs `--batch --yes`, `unzip` needs `-o`, `ln` needs `-sf`.
  Test the second run, not just the first.
- **Never overwrite what belongs to the user.** Write to a path your entry owns, or a clearly
  marked block. `.bashrc`, `.gitconfig`, `.bash_aliases` and SSH keys are not yours.
- **Undo exactly what you did.** `remove.sh` should leave the machine as it was — including
  removing an apt repo and key your install added. Verify by diffing a file before and after a
  full apply/revert cycle.
- **Refuse rather than damage.** If removing a package would take unrelated software with it, or
  hardening SSH would lock the user out, stop and explain. Skipping is a valid outcome.
- **Fail with a sentence, not a status code.** Check for a missing tool up front and say what to
  install, rather than dying with `command not found` and exit 127.

### Verify before you claim

Do not trust a package identifier from memory — every one of these has been wrong at least once:

```bash
curl -s "https://flathub.org/api/v2/appstream/<app.id>"                      # Flathub
curl -s "https://formulae.brew.sh/api/cask/<name>.json"                      # Homebrew cask
curl -s "https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/<l>/<Pub>/<Name>"
```

Then run the entry's whole lifecycle in a throwaway container, not on your own machine:

```
detect (expect 1) → install → detect (expect 0) → install again → remove → detect (expect 1)
```

The re-run and the removal are where bugs actually live.

## Adding a profile

A profile is one TOML file in `profiles/`, listing entries by `category/kind/id`:

```toml
name = "Example"
description = "What this bundle is for"
entries = ["dev-tools/install/git", "dev-tools/install/jq"]
```

Profiles are additive: applying one never unchecks something already selected. A test validates
every key against the real catalog, so a typo fails the suite rather than silently selecting less
than the user asked for.

## Changing the engine

```bash
deno task test     # unit tests
deno task check    # type-check
deno task lint
deno task fmt
```

Two habits this codebase depends on:

**Check that your code is reachable.** Several fully-tested modules once sat wired to nothing —
unit tests cannot catch that, because a test imports the module directly, which is exactly what
the app was failing to do. Grep what `src/tui/App.tsx`, `src/startup/` and `main.tsx` actually
import.

**Write the test so it can fail.** After adding one, break the thing it covers and confirm it goes
red. Tests here have passed for the wrong reason more than once — a fixture missing a field, an
extraction anchored on the wrong string.

Anything touching real OS state (installing, elevation, terminal rendering) is verified by running
it in a container and saying so, not by a unit test that mocks the interesting part away.
