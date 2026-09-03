# Platform Equivalents

This document extracts every software install and system configuration currently handled by the Linux (`installers/`) and macOS (`installers_macos/`) scripts, and maps each one to its counterpart on the other platforms — including a proposed Windows column, since Windows support doesn't exist yet.

Legend:
- **N/A** — this role doesn't apply on that platform (explained in Notes).
- **(unresolved)** — checked against real sources; no confident answer found yet, flagged rather than guessed.
- Entries already present in the current repo are listed as-is; everything else is a proposal.

All software-availability claims below have been checked against official sources (project sites, GitHub releases, Flathub) — see the **Verified corrections** section at the bottom for what changed from the first draft and the sources used.

---

## 1. System configuration, privacy, and identity

| Role | Linux (current) | macOS (current) | Windows (proposed) | Notes |
|---|---|---|---|---|
| Disable telemetry/diagnostics | Disable Ubuntu/Zorin telemetry, crash reporting (apport, whoopsie, ubuntu-report) | Disable Apple diagnostics, Siri analytics, ad tracking, smart quotes | Disable Windows diagnostic data (DiagTrack service), Cortana data collection, ad ID, Copilot data use | Same role, entirely different mechanisms per OS |
| Power profile | GNOME power-profiles-daemon → performance | *(none currently)* | Windows power plan → High performance / Balanced | Not currently handled on macOS; macOS manages this automatically |
| General system tweaks | inotify watchers, swappiness, SSD TRIM, SSH hardening, fixed workspaces | Finder (hidden files, extensions, path bar), keyboard repeat rate, trackpad tap-to-click, screenshot location, firewall on | File Explorer (show hidden files/extensions), SSD TRIM scheduling, OpenSSH hardening, power/performance tweaks | Same role, OS-specific settings underneath |
| Theme | Dark theme, wallpaper, ZorinGrey-Dark icon pack | Dark mode, wallpaper, graphite accent color | Dark mode, wallpaper, accent color | Directly equivalent on all three |
| SSH key | Generate ED25519 key | Generate ED25519 key, add to macOS Keychain | Generate ED25519 key (OpenSSH is built into Windows 10+), store via Windows Credential Manager | Same role, different credential store |
| Git identity config | git user/email, default branch, pull strategy | Same, plus `osxkeychain` credential helper | Same, plus Git Credential Manager (bundled with Git for Windows) | Directly equivalent |
| Dotfiles / shell aliases | bash/zsh dotfiles | bash/zsh dotfiles | PowerShell profile (`$PROFILE`) equivalent | Same role, different shell target |
| Desktop settings backup/restore | GNOME settings via `dconf dump`/`dconf load` | *(none currently — could use `defaults export`/plist backups)* | *(none currently — could use registry export of relevant keys)* | Same role, no shared mechanism; GNOME-specific today |
| Keep-system-awake utility | GNOME Shell extension (Caffeine) | Built-in `caffeinate` CLI, or Amphetamine app | PowerToys "Awake" module | Directly equivalent role, different implementations |
| Taskbar / Dock configuration | GNOME taskbar layout, pinned apps | Dock auto-hide, icon size, pinned apps, remove recents | Windows taskbar pinned apps/layout | Directly equivalent |
| GNOME extension management | Extension Manager (flatpak) | N/A | N/A | GNOME Shell–specific concept, doesn't exist on macOS/Windows |
| Firewall | ufw | Built-in Application Firewall (covered under System Tweaks) | Windows Defender Firewall | Directly equivalent, native to each OS |
| Startup items / background services reduction | Disable unnecessary `systemd` user/system services; remove unwanted `~/.config/autostart/` entries | Disable unnecessary Login Items; review/disable non-essential `launchd` agents | Disable unnecessary Startup Apps (Task Manager's Startup tab / `HKCU...\Run`); review non-essential services | New capability, not present in the current scripts at all — scope conservatively to a known-safe list rather than a blanket disable |
| Cleanup leftover installers | Remove `.deb`/`.tar.gz`/`.AppImage` from Downloads | Remove `.dmg`/`.pkg`/`.tar.gz` from Downloads | Remove `.exe`/`.msi` from Downloads | Directly equivalent |

## 2. Development tools

| Role | Linux (current) | macOS (current) | Windows (proposed) |
|---|---|---|---|
| Core CLI tools | apt: git, curl, htop, build-essential, gnupg | brew: git, curl, jq, htop, tmux, coreutils, cmake | git, curl (bundled since Win10), jq, cmake; htop has no direct Windows port — `btop` (cross-platform) covers the same role |
| Node/pnpm version manager | Volta | Volta | Volta (has a native Windows installer) |
| AI coding assistant | Claude Code | Claude Code | Claude Code (runs under Node on Windows; also works inside WSL) |
| AWS CLI | AWS CLI | AWS CLI | AWS CLI (official MSI installer) |
| Go | Go | Go | Go (official Windows installer) |
| Rust | rustup | rustup | rustup (official `rustup-init.exe`) |
| Python | apt Python 3 + pip/venv | brew Python 3 | Python (official installer / Microsoft Store) |
| Terraform | Terraform | Terraform | Terraform (official Windows binary) |
| GitHub CLI | GitHub CLI | GitHub CLI | GitHub CLI (official Windows installer) |
| IDE manager | JetBrains Toolbox | JetBrains Toolbox | JetBrains Toolbox (official Windows installer) |
| Lightweight code editor | VSCodium | VSCodium | VSCodium (official Windows installer) |
| Containers | Docker (Engine) | Docker Desktop | Docker Desktop |
| Container GUI (Podman) | Pods | Podman Desktop | Podman Desktop (officially cross-platform — could replace Pods everywhere) |
| VM manager | Boxes | UTM | Hyper-V Manager (built-in) or VirtualBox |
| Linux container distro manager | DistroShelf | N/A | N/A | Concept tied to `distrobox`, Linux-only |

## 3. Browsers

| Linux (current) | macOS (current) | Windows (proposed) |
|---|---|---|
| Zen Browser | *(missing — confirmed official Windows 10/11 and macOS 12+ builds exist)* | Zen Browser |
| Ungoogled Chromium | Ungoogled Chromium | Ungoogled Chromium |
| LibreWolf | *(missing — confirmed official Windows installer, portable build, and Microsoft Store listing)* | LibreWolf |
| Helium | Helium | Helium (confirmed — official Windows/macOS/Linux builds via separate repos and an auto-detecting installer at helium.computer; project is currently in beta) |

Zen Browser and LibreWolf are confirmed to ship official Windows and macOS builds but are only in the current Linux script — these are quick wins, not new equivalents to design.

## 4. Communication

| Linux (current) | macOS (current) | Windows (proposed) |
|---|---|---|
| Beeper | Beeper | Beeper |
| Signal | Signal | Signal |
| Proton Mail | Proton Mail | Proton Mail |

## 5. Security & privacy apps

| Linux (current) | macOS (current) | Windows (proposed) |
|---|---|---|
| Proton Pass | Proton Pass | Proton Pass |
| Proton VPN | Proton VPN | Proton VPN |
| Cryptomator | Cryptomator | Cryptomator |

## 6. Media

| Linux (current) | macOS (current) | Windows (proposed) |
|---|---|---|
| VLC | VLC | VLC |
| OBS Studio | OBS Studio | OBS Studio |
| HandBrake | HandBrake | HandBrake |
| Parabolic | Macabolic (native macOS port) | Parabolic (confirmed — official Windows installer + portable build) |
| Grayjay | Grayjay | Grayjay (confirmed — official Windows x64 build; macOS build is Apple Silicon/arm64 only, no Intel) |

**Notable finding:** official Parabolic added a real macOS app of its own in release 2026.4.0 (April 2026) — before that it had no macOS support at all, which is presumably why Macabolic (a separate SwiftUI reimplementation) exists. Now that upstream ships macOS directly, it's worth deciding whether to keep using Macabolic or switch to official Parabolic on macOS as well, for one app instead of two to maintain.

## 7. Creative

| Linux (current) | macOS (current) | Windows (proposed) |
|---|---|---|
| Boxy SVG | *(missing — confirmed native Windows and macOS apps, plus a web app; ChromeOS uses the web/Chrome-app path)* | Boxy SVG |
| Minder | N/A | N/A — confirmed Minder itself is GTK-only with no Windows/macOS build. **Freeplane** is a confirmed actively-maintained, genuinely cross-platform (Java, Windows/macOS/Linux) mind-mapping app that fills the same role — a different app, not a port. |

## 8. Productivity

| Linux (current) | macOS (current) | Windows (proposed) |
|---|---|---|
| OnlyOffice | OnlyOffice | OnlyOffice |
| Blanket (ambient sound) | Blankie (native macOS port) | (unresolved — confirmed Blanket itself is GTK/Flathub-only with no Windows build; a Windows-native replacement wasn't confirmed to a satisfactory confidence level. Endel and Ambie White Noise are real, currently-shipping Windows apps in this space, but weren't verified as clearly "the best actively-maintained option" — needs a second, dedicated look before picking one.) |

## 9. System utilities

| Role | Linux (current) | macOS (current) | Windows (proposed) |
|---|---|---|---|
| System monitor | Mission Center | Mission Center | N/A — confirmed Mission Center is GTK4/libadwaita with Linux-only dependencies (DRM libs, no Windows build exists or is planned). **System Informer** (formerly Process Hacker) is a confirmed actively-maintained, real-time CPU/memory/disk/GPU/network monitor for Windows that fills the same role. |
| Network scanner | Angry IP Scanner | *(missing — confirmed official Windows, macOS, and Linux support)* | Angry IP Scanner |
| Logitech device manager | Solaar (community, for official-support gap on Linux) | Logi Options+ | Logi Options+ (official, same as macOS) |
| Stream Deck control | Stream Controller (community) | Stream Deck (official) | Stream Deck (official) |
| Flatpak permission manager | Flatseal | N/A | N/A — Flatpak-specific concept, not solved by WSL either (§15) |
| Flatpak app/runtime cleanup | Warehouse | N/A | N/A — Flatpak-specific concept, not solved by WSL either (§15) |
| AppImage integration | GearLever | N/A | N/A — AppImage-specific concept |
| Flathub storefront | Bazaar | N/A | N/A — Flathub-specific concept, not solved by WSL either (§15) |
| Zero-config VPN mesh | Tailscale | Tailscale | Tailscale |

## 10. Gaming

| Role | Linux (current) | macOS (current) | Windows (proposed) |
|---|---|---|---|
| Game storefront | Steam | Steam | Steam |
| Minecraft | Minecraft | Minecraft | Minecraft |
| Game streaming client | Moonlight | Moonlight | Moonlight |
| Game streaming host | Sunshine | Sunshine (marked experimental) | Sunshine (Windows is Sunshine's primary/best-supported target) |
| Epic/GOG launcher | Heroic Games Launcher | Heroic Games Launcher | Heroic Games Launcher |
| Windows-game compatibility layer | Lutris, Bottles | N/A (unresolved — CrossOver or Whisky would fill a similar role, not independently verified this round) | N/A — games run natively, no compatibility layer needed |

## 11. AI / local LLMs

| Role | Linux (current) | macOS (current) | Windows (proposed) |
|---|---|---|---|
| Local model runner/chat UI | LM Studio | LM Studio | LM Studio |
| Lightweight native chat UI | Alpaca (GNOME-specific) | N/A | N/A — confirmed Alpaca is GTK4/libadwaita, Flathub-only, no Windows/macOS build. **Jan** (by Menlo Research) is confirmed actively maintained (42k+ GitHub stars, frequent releases) and genuinely ships Windows/macOS/Linux builds — a strong replacement, and arguably good enough to use on all three platforms instead of keeping Alpaca as the Linux-only choice. |

## 12. 3D printing

| Linux (current) | macOS (current) | Windows (proposed) |
|---|---|---|
| OrcaSlicer | OrcaSlicer | OrcaSlicer |

## 13. Pre-installed software removal (debloat), by role

| Role | Linux removes | macOS removes | Windows equivalent target |
|---|---|---|---|
| Redundant browser | Brave | — | — (Edge isn't bundled the same removable way; not a direct parallel) |
| Redundant office suite | LibreOffice (→ OnlyOffice) | Keynote, Pages, Numbers (→ OnlyOffice) | Any OEM-bundled trial office suite, if present |
| Redundant mail client | Thunderbird (→ Proton Mail) | — | Mail & Calendar app (→ Proton Mail) |
| Redundant music player | Rhythmbox | — | Groove Music / legacy Windows Media Player (→ VLC) |
| Redundant video player | Totem/Videos | — | Films & TV app (→ VLC) |
| Video editor (large, unused) | — | iMovie (~2.4GB) | — |
| Audio production suite (large, unused) | — | GarageBand (~1.5GB) | — |
| Webcam app | Cheese | — | Camera app (lower priority — often still useful) |
| Photo manager | Shotwell | — | Photos app |
| Maps | GNOME Maps | — | Maps app |
| Weather | GNOME Weather | — | Weather app/widget |
| Scanner | Simple Scan | — | Windows Scan app |

### Windows-only debloat targets with no current Linux/macOS counterpart

All shipped as their own entries (2026-09-03), which is what lets a user keep some and remove
others rather than accepting one all-or-nothing sweep:

Xbox app · Xbox Game Bar · Xbox support components · Cortana · Copilot · OneDrive · Skype ·
Get Help · Tips · 3D Viewer · Mixed Reality Portal · Weather · News · Maps · People ·
Feedback Hub · Phone Link · Quick Assist · Dev Home · Power Automate · Alarms & Clock ·
Media Player · Movies & TV · Clipchamp · Sound Recorder · Camera · Paint 3D · Office hub ·
Microsoft To Do · Sticky Notes · Teams (personal) · Outlook (new) · Solitaire Collection ·
promotional Start-menu suggestions.

**Deliberately excluded**, because "preinstalled" is not the same as "bloat" and removing these
breaks a working system: the Microsoft Store itself (nothing could be reinstalled without it),
Windows Terminal, Calculator, Notepad, classic Paint, Photos, Snipping Tool, and anything under
Windows Security. Edge is also absent — it is not removable as an Appx package on most builds, and
an entry that silently fails is worse than no entry.

**OEM trialware** (McAfee, Norton and similar) is *not* covered and cannot sensibly be: it varies
by manufacturer and model, ships under names this catalog cannot predict, and is usually a normal
installer rather than a Store package. Removing it through Settings › Apps is the honest answer.

### macOS: what is actually removable

Only five — **GarageBand, iMovie, Keynote, Pages, Numbers** — and the catalog covers all of them.

Everything else Apple preinstalls (Chess, Stocks, News, Podcasts, TV, Music, Books, Maps,
Reminders, Freeform, Home, Voice Memos, Mail, Safari …) lives in `/System/Applications` on the
sealed, read-only system volume. Those cannot be deleted even as root: the volume is
cryptographically sealed, and defeating that means disabling SIP and breaking system updates. The
five above are removable precisely because they are App Store deliveries in `/Applications`
instead.

So the macOS list is short not because it is unfinished, but because macOS does not permit more.
An entry promising to remove Podcasts would fail on every Mac.

## 14. Platform-exclusive items (no equivalent elsewhere)

- **Linux-only, by design**: GearLever, Flatseal, Warehouse, Bazaar, Extension Manager, DistroShelf, GNOME Settings backup/restore, GNOME Extensions, Power Profile — all tied to Flatpak/AppImage/GNOME concepts that don't exist on macOS or Windows.
- **WinBoat** — runs Windows applications on Linux via a Windows VM + RDP. Meaningless on Windows itself (native); on macOS the same underlying need (run Windows software) is served by a different tool entirely (Parallels/UTM + a Windows VM), not a direct port.
- **macOS removals** (GarageBand, iMovie, Keynote, Pages, Numbers) — these exist only because Apple preinstalls them; no equivalent bloat exists on Linux, and Windows' preinstalled-bloat list is its own distinct set (§13).

## 15. Windows: native support vs. what WSL adds

Windows support isn't one thing — it splits into what runs natively on Windows and what a WSL (Windows Subsystem for Linux) environment can add on top. These don't overlap much, so WSL should be framed as an addition to native Windows support, not an alternative implementation of it.

| Area | Native Windows | Windows + WSL |
|---|---|---|
| CLI dev tools & language toolchains (git, Python, Go, Rust, Node/Volta, Terraform, AWS CLI, GitHub CLI, Claude Code, apt-based common tools) | Available via native installers | **Solved well.** Running the same Debian/Ubuntu catalog inside WSL is just a real Linux userspace — this is the most reliable path to full parity with the Linux dev-tool set, unmodified. |
| Docker | Docker Desktop | Docker Desktop already uses a WSL2 backend by default today (confirmed). Once WSL is set up, running plain Docker Engine directly inside the WSL distro is a legitimate lighter-weight alternative to installing Docker Desktop at all. |
| GNOME desktop-shell concepts (taskbar/dock layout, GNOME Shell extensions, dconf desktop-settings backup, wallpaper/theme-as-a-shell) | Native Windows equivalents (§1) | **Not solved by WSL.** WSL provides a Linux kernel and userspace, not a running GNOME Shell session — there is no desktop shell to configure. This bucket stays genuinely Linux-desktop-only regardless of WSL. |
| Standalone Flatpak GUI apps (GearLever, Flatseal, Warehouse, Bazaar, and Flatpak-packaged apps generally) | N/A natively | **Confirmed not reliably workable today.** WSLg itself is mature for native Linux GUI apps on Windows 11 (Wayland/X11 compositor, audio, clipboard all work). But Flatpak specifically has documented, currently-open problems under WSL2: enabling systemd (needed for Flatpak's dbus/portal machinery) breaks Flatpak with a bubblewrap `/dev/shm` mount error ([microsoft/WSL#9119](https://github.com/microsoft/WSL/issues/9119)); Flatpak apps get no GPU acceleration under WSLg ([microsoft/wslg#690](https://github.com/microsoft/wslg/issues/690)); specific apps are reported failing to launch entirely ([microsoft/wslg#871](https://github.com/microsoft/wslg/issues/871)). Treat this whole bucket as a known limitation, not a pending feature to test later. |

**Practical implications:**
- The WSL distro offered should be Debian or Ubuntu specifically, to match the Linux support scope already decided on — this keeps the same apt+flatpak catalog reusable inside WSL without a second code path (with the caveat above that the *flatpak* half of that catalog won't actually work there).
- WSL is worth offering as "set up your Linux dev environment," not as "get the full Linux desktop app catalog on Windows" — the second framing would overpromise given the Flatpak/GUI limitation above.
- The GNOME-shell-specific and Flatpak-GUI buckets in §14 remain genuinely Linux-only even with WSL available; don't reclassify them.

## Verified corrections

The first draft of this document flagged several Windows-column entries as unverified guesses. All of them have since been checked against official sources (project sites, GitHub releases/issues, Flathub) and corrected in place above. Summary of what changed:

- **Confirmed cross-platform** (were flagged uncertain, now confirmed available on all listed platforms): Helium (beta, Win/macOS/Linux), Zen Browser, LibreWolf, Boxy SVG, Grayjay (macOS build is Apple Silicon-only), Angry IP Scanner.
- **Corrected**: Parabolic now officially supports Windows *and* macOS (macOS added in release 2026.4.0, April 2026) — it isn't just Windows/Linux as first assumed, and the Macabolic fork may no longer be necessary.
- **Confirmed Linux-only, with a real replacement app identified**: Mission Center (→ System Informer on Windows), Minder (→ Freeplane, genuinely cross-platform), Alpaca (→ Jan, genuinely cross-platform and possibly a better single choice for all three OSes).
- **Confirmed Linux-only, replacement still unresolved**: Blanket — no Windows-native ambient-sound app was verified to a satisfactory confidence level; needs a dedicated follow-up rather than a guessed pick.
- **WSL/Flatpak feasibility**: checked directly against Microsoft's own WSL/WSLg issue trackers rather than assumed — see §15.
