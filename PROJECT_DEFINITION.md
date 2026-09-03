# Project Definition

Status: draft — capturing scope before any implementation. This document describes **what** the tool does. It intentionally makes no claims about language, libraries, file formats, or package-manager choices — those are implementation decisions to be made separately.

## Vision

A universal, cross-platform machine setup and configuration tool. One project, usable by anyone (not tied to a single person's identity or preferences), that takes a freshly installed macOS, Debian/Ubuntu-based Linux, or Windows machine and brings it to a fully configured, chosen state: apps installed, privacy hardened, security hardened, quality-of-life tweaks applied — all through a single command and an interactive, reviewable process.

## 1. Cross-platform reach

- Runs from a single command on macOS, Linux (Debian/Ubuntu family), and Windows.
- On Windows, if WSL is available, offers to also set up a Linux development environment inside WSL, in addition to (not instead of) native Windows setup.
- If WSL is not installed on Windows, offers to install it as an optional step.
- Behaves consistently across platforms: the same categories of capability (apps, privacy, quality-of-life, security, removal) exist on every platform, even where the underlying software differs.

## 2. Catalog taxonomy: kind, category, and profiles

- **The selection states desired machine state, not a queue of actions.** A checked entry means "this should be present on this machine"; an unchecked one means "this should not be". The tool works out the difference and does whichever direction is needed — installing what is checked and missing, removing what is unchecked and present. This is the single idea a user has to hold, and everything else follows from it.
- On a first run, everything already present starts checked. Without that, an empty selection on a machine full of software would read as "remove all of it".
- Every catalog entry has exactly one **kind**: `install` (add software), `configure` (change a setting), or `cleanup` (remove something). This is a small, closed set that every entry fits into without exception. **In practice `cleanup` is currently unused**: once selection became desired state, removing preinstalled software is simply unchecking an ordinary `install` entry, and the things that once looked like cleanup entries (disabling telemetry) are `configure` entries. The kind remains in the schema and the engine handles it, but no entry uses it — see TASKS.md.
- Each kind implies its own natural opposite action, which is what makes reversibility (§14) possible: install ↔ uninstall, configure ↔ revert to the prior value, cleanup ↔ reinstall if removed by mistake. Because every kind defines `remove` as "undo `install`", the engine can plan a reversal uniformly without special-casing the kind.
- Every entry, regardless of kind, is defined by the same four operations: **detect** (is this already applied on the current machine, right now), **install** (perform the entry's primary action), **remove** (undo it), and **update** (bring it in line with a newer desired state — a newer app version, or a changed recommended setting). This uniform contract is what makes install, configure, and cleanup entries interchangeable at the engine level, even though what each operation *means* flips by kind: for a cleanup entry, "install" performs the removal and "remove" is the undo.
- Independently of kind, every entry also carries a **category** (browsers, communication, dev tools, media, gaming, privacy, security, quality-of-life, system utilities, etc.) — this is how entries are grouped and browsed, and it cuts across all three kinds. For example, "security" spans an install entry (a password manager), a configure entry (enabling the firewall), and a cleanup entry (removing an insecure default) all at once.
- A **profile** is a named, savable selection of entries spanning multiple kinds and categories at once — a persona such as Developer, Gaming or Privacy — so choosing one profile can install software and apply configuration in a single pick.
- **The Cleanup persona described in earlier drafts does not fit this model and is not built.** It was defined as strictly subtractive — remove bloatware, strip telemetry, quiet background services. But profiles are additive by construction (below), and under desired-state selection removing software *is* unchecking. A subtractive profile would therefore have to deselect entries, which is precisely what profiles must never do. Delivering it needs either a separate "deselect these" mechanism or an explicit subtractive-profile concept; neither is designed yet, and the conflict is recorded here rather than papered over.
- Profiles are additive-only: applying one only turns things on — it never silently deselects something a different profile or the user's own prior choices already turned on. This keeps stacking multiple profiles predictable, and matters more under desired-state selection than it did before: a profile that could uncheck things would be a profile that could uninstall things.
- A profile's effect is a point-in-time result, not an enforced invariant: a later, separately-chosen install can legitimately reintroduce something an earlier cleanup removed (installing a container runtime after running Cleanup will reasonably bring back a background service Cleanup had disabled). This is expected, not a conflict — the tool never continuously re-enforces an earlier profile's outcome against later deliberate choices; diagnostics (§3) simply reports the live truth each time.
- Built-in profiles ship with the tool; users, including through their personal customization repos (§12), can define their own.

## 3. System diagnostics

- Before presenting anything to choose from, runs a diagnostic pass: basic system requirements (internet connectivity, available disk space), platform/package-manager capability (which install methods are actually usable on this machine — apt, flatpak, brew, winget, WSL presence and distro), and, for every catalog entry that applies to this platform, its current state via that entry's detect operation (§2).
- This diagnostic state is what the interactive selection screen (§5) uses to mark each item's real, current status directly in the list — already installed, already configured, needs an update, not present — rather than the user discovering this only after starting a run.
- Diagnostics reflects live system state, checked fresh each run, which is distinct from the user's remembered prior selections (§5): the two can disagree (something was installed or removed outside the tool since the last run), and where they do, the diagnosed live state is shown as current truth, with the remembered selection shown alongside it as "what you'd previously chosen."
- If a basic requirement isn't met (no internet, insufficient disk space) or a needed package-manager layer isn't available and can't be trivially set up, this is surfaced before the user starts selecting anything, not partway through a run.

## 4. Software installation

- Maintains a catalog of installable software, organized by category (browsers, communication, security, dev tools, media, creative, gaming, productivity, system utilities, AI tools, etc.).
- For each catalog entry, supports installing the equivalent software on whichever platform the tool is running on — same capability/role, appropriate app per OS, without requiring the user to know per-OS package names.
- Recognizes that not every app has a cross-platform equivalent; entries that don't apply to the current OS are clearly marked as not applicable rather than forced into a substitute.
- Detects already-installed software and skips reinstalling it unless the user asks to update/force it.
- Supports updating previously installed apps (all of them, or a specific one by name).
- Supports installing only a specific subset of software, selected by the user.

## 5. Interactive selection

- Presents all available software and configuration options as a checkable list, grouped by category, so the user can pick exactly what they want.
- Each item in the list reflects its diagnosed state (§3) directly — already installed/configured items are visibly marked as such, not indistinguishable from ones that still need action.
- Supports selecting/deselecting entire categories at once, and searching/filtering the list.
- Supports named presets/profiles (§2) that pre-select a sensible set of entries spanning install, configuration, and cleanup, which the user can still adjust before running.
- A profile can be chosen by name from what's already available (built-in, or from the user's configured personal repo, §12), or loaded ad hoc by pasting a URL at selection time — so a profile can be shared as a link and tried without the recipient first setting up a personal overlay repo. A profile loaded this way is untrusted until reviewed: its source is shown alongside the plan (§14) before anything in it is allowed to run.
- Remembers the user's previous selections between runs, and can highlight what's new or changed since the last run.
- Supports a fully unattended mode that skips all interactive prompts (for scripted/first-boot use).
- Supports a preview mode that shows exactly what would happen — every step, in order, with a description — without making any changes.
- Before actually applying changes, shows a clear, reviewable plan of everything that is about to happen (what will be installed, what will be changed, what requires elevated/admin privileges) so the user can confirm before anything irreversible starts.

## 6. Privacy configuration

- Provides configuration options to disable OS-level telemetry, diagnostics, and crash-reporting services.
- Provides options to remove or block trackers and advertising integrations built into the OS.
- Provides options to configure network-level privacy protections (e.g. DNS privacy, hosts-based tracker/ad blocking).
- Privacy options are presented and selected the same way as software installs (checkable list, categorized, previewable).

## 7. Quality-of-life configuration

- Applies desktop/system preferences the user wants out of the box: theme (dark mode), wallpaper, dock/taskbar layout and pinned apps, default applications, keyboard/trackpad behavior, and similar day-to-day comfort settings.
- Deploys the user's own shell aliases and dotfiles.
- Sets up developer identity configuration (git user/email, SSH key generation) based on the user's own information, not a fixed identity baked into the tool.

## 8. Security configuration

- Provides options to enable and configure the OS firewall with sensible defaults.
- Provides options to harden SSH and other remote-access configuration.
- Provides options to check and recommend disk encryption status (without silently enabling it, given how disruptive that can be).
- Provides options to configure automatic OS/security updates.
- Provides options to disable unnecessary startup items and background services, reducing both attack surface and background resource use — scoped conservatively to known-safe, well-understood items rather than a blanket "disable everything," since breaking something the user actually needed running is worse than leaving one extra background process alive.

## 9. Removal / debloat

- Provides an optional list of pre-installed software the user may want removed (e.g. redundant browsers, office suites, media apps, OS-bundled bloatware), with per-platform equivalents of "things most people don't want."
- Removal is opt-in and selected the same way as everything else (checkable list, previewable before running).

## 10. Rich terminal interface

- Presents a full-screen, windowed terminal interface (not a simple linear list of yes/no prompts): distinct panes/areas for browsing categories, viewing details/descriptions, and watching live progress/output.
- Supports scrolling through long lists and logs.
- Supports mouse interaction (click to select/expand, scroll with the wheel) as well as full keyboard navigation, so it's usable either way.
- Shows live progress and status for whatever is currently being installed or configured.
- Provides a history/log view within the interface for reviewing past runs, not just the current one.

## 11. Extensibility

- Adding a new piece of software, a new privacy/quality-of-life/security option, or something to remove is a matter of describing it in the catalog — which of the three kinds it is (§2), what category it belongs to, what platforms it applies to, and its four operations: detect, install, remove, update (§2) — not a change to how the tool works.
- The catalog is organized so that similar things (all software, all privacy options, all security options, etc.) live together and follow the same shape, making it easy to find the right place to add something new.
- The project itself is meant to be maintained and extended by more than one person over time, so contribution should be approachable without deep knowledge of the tool's internals.

## 12. Personal customization without forking

- The tool ships with a generic, general-purpose catalog and no assumptions about who is running it.
- A user can point the tool at their own separate git repository containing their personal customizations: their own identity/profile information (name, email, preferred wallpaper, etc.), their own additional catalog entries (install, configure, or cleanup) and overrides of the built-in ones, and their own custom profiles (§2) built from any mix of built-in and personal entries.
- Personal customizations layer on top of the built-in catalog rather than requiring the user to modify or fork the tool itself.
- Multiple people can use the same shared tool while each maintaining their own separate, private customization repo.

## 13. History and logging

- Every run records what was done: what was installed, updated, skipped, or failed, when, and by which action — not just a raw scrollback of command output.
- This history is reviewable later, both to audit what has been done to a machine over time and to help diagnose failures.
- Failures in one step do not stop the rest of the run; failures are recorded and summarized at the end alongside everything that succeeded or was skipped.

## 14. Reversibility and safety

- Where feasible, configuration changes (privacy, security, quality-of-life) record what the setting was before they changed it, so changes can be reviewed or reversed later.
- The tool is explicit about which steps require elevated/admin privileges and when it is about to request them.
- Nothing destructive or hard-to-reverse (disk encryption, major removals, registry-level changes) happens without the user having seen it named in the plan first.
- Some things are deliberately *not* reversed, because the reversal would be worse than the asymmetry: a generated SSH private key is never deleted (it may be authorised on machines this tool knows nothing about and cannot be recovered), and a removal that would take unrelated software with it is skipped and reported rather than performed.
- Content from a source the user hasn't explicitly configured ahead of time — such as a profile loaded from a pasted URL (§5) — is treated as untrusted: its origin and full contents are shown as part of the plan, with no exception to the confirm-before-running rule, before it's allowed to touch the system.

## 15. Privilege elevation

- The tool itself never runs as root/administrator as a whole — only the specific operations that actually require elevated access run elevated; everything else (diagnostics, browsing, selection, the plan review, downloads to user-space) runs as the normal user.
- Whether an operation needs elevated access is a declared property of that entry's operations (§2) — most `detect` operations need none even for a system-owned target; `install`/`remove`/`update` might. This is known before the plan is shown, so the confirmed plan can state upfront how many of the planned actions require elevated access, and a run with none of them never prompts for it at all.
- Elevated access is requested once per run, at the point the user confirms the plan and the apply phase is about to begin — never upfront "just in case," and never repeatedly, once per action.
- Elevated access is explicitly released at the end of the run; nothing elevated is left cached or running longer than the run that needed it.
- The mechanism differs by OS (credential-caching on Linux/macOS, a single elevated helper process on Windows, since Windows has no equivalent of a cacheable elevation session) but the experience is the same on every platform: one clearly-explained request, scoped to only what needs it, released when done.

## 16. Identity and universality

- The tool carries no hardcoded personal information belonging to any individual; all identity-related configuration (name, email, SSH key details, wallpaper, personal preferences) comes from the user running it, or from their personal customization repo.
- Documentation, setup instructions, and behavior are written for an unknown/general audience, not for a single specific person's machine.
- The tool does not collect or transmit any usage data about the people running it.

## 17. Distribution and lifecycle

- Can be obtained and run via a single command per platform, without requiring a complex manual setup process first.
- Can update itself to newer versions of the tool.
- Can refresh its built-in catalog independently of the user's own selections, so new software/options become available over time without the user having to redo their configuration.
- Supports exporting a user's current selections as a single shareable file, so the same setup can be reproduced on another machine.

## 18. Project sustainability

- Includes the documentation and community-facing material expected of a project meant for general public use (clear setup instructions for each platform, a contribution guide, a license, a way to report security concerns).
- Has automated checks that catch broken or malformed catalog entries before they reach users, given the tool executes with elevated privileges.
