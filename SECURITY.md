# Security

This tool installs software and changes system configuration. Some of that needs `sudo` or
administrator rights. That makes a few things worth stating plainly.

## Reporting a concern

Please report suspected vulnerabilities privately rather than opening a public issue — a catalog
entry that installs the wrong thing, or a script that can be made to run something unintended, is
exploitable the moment it is described publicly.

Open a [private security advisory](https://docs.github.com/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)
on the repository. Include what you did, what happened, and which platform.

Useful things to look for:

- A catalog entry pointing at an identifier or URL that is not the vendor's.
- A script where a filename, package name or URL derived from input could be made to run something
  else.
- Anything that widens privileges beyond the single action being performed.

## What the tool does with elevated access

- **It never runs as root as a whole.** The engine and interface run as your user. Only individual
  scripts call `sudo`, and only for the specific commands that need it.
- **Elevation is requested once, and only when needed.** If the confirmed plan contains no action
  requiring it, you are never asked. The credential is refreshed while the run is in progress and
  released (`sudo -k`) when it ends — including when the run fails.
- **Nothing runs before you confirm.** The plan lists every action, marks the destructive ones, and
  says which require elevated access.
- **`detect.sh` never uses `sudo`.** The startup scan runs unelevated, by design and by test.

## Trust boundaries

**The bundled catalog is code.** Every entry is a shell script that runs on your machine, mostly
with `sudo`. Read an entry before selecting it; they are deliberately small, plain files.

**Overlay repositories are entirely your trust.** Pointing the tool at a git repository means its
scripts run on your machine with the same privileges as the bundled ones. Point it only at
repositories you control or have reviewed, and pin a ref rather than tracking a moving branch.

**Profiles loaded from a URL are treated as untrusted.** Their origin and full contents are shown
before anything from them can run, and entries they contribute are marked in the plan. That is a
disclosure mechanism, not a sandbox — read what it shows you.

**Scripts run with your environment.** Your identity (name and email, when configured) is passed to
scripts that need it via `AUTOINSTALL_IDENTITY_*` variables, so it is visible to every script in a
run.

## Deliberate limits

Some things are intentionally not done, because the safe-looking version would be worse:

- **Private SSH keys are never deleted.** Removing the SSH key entry leaves the key in place and
  tells you how to delete it yourself — a key may be authorised on machines this tool knows nothing
  about, and it cannot be recovered.
- **Removals stop rather than take collateral.** If uninstalling something would remove unrelated
  packages, the removal is skipped and reported.
- **SSH hardening refuses without a usable key.** Disabling password authentication with no
  authorized key is how people permanently lose access to a remote machine.
- **Automatic updates are limited to security updates.** The tool does not enable unattended
  operating-system version upgrades.

## Known gaps

Stated because you should know before trusting the tool with a machine:

- **macOS and Windows entries have never been executed.** They are verified against package
  registries and vendor documentation only. Treat them with more caution than the Linux entries.
- **Released binaries are not signed or notarised yet.** macOS will refuse to open one without an
  explicit Gatekeeper override, and SmartScreen will warn on Windows.

  The release workflow is ready for it and does nothing until certificates exist. Set the
  repository variable `SIGNING_ENABLED` to `true` and provide these secrets:

  | Secret | For |
  | --- | --- |
  | `WINDOWS_CERT_BASE64`, `WINDOWS_CERT_PASSWORD` | Authenticode signing (a base64 `.pfx`) |
  | `APPLE_CERT_BASE64`, `APPLE_CERT_PASSWORD` | Developer ID Application certificate (`.p12`) |
  | `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_APP_PASSWORD` | Notarisation via `notarytool` |

  With the variable off, signing is skipped and the release publishes unsigned. With it on but a
  secret missing, the build **fails deliberately** rather than publishing a binary presented as
  signed when it is not.
- **The installers do verify checksums**, and refuse to run a download that has none: both
  `install` and `install.ps1` fetch `SHA256SUMS` from the release, and stop
  with an explanation if it is absent or does not match. That is not a substitute for signing —
  it proves the file matches what the release published, not who published it.
- **An external `kill` can leave the terminal in raw mode.** Signal handlers do not fire while the
  interface holds the terminal; `reset` restores it. Ctrl+C is handled normally.
