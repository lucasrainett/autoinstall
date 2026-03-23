# autoinstall

Post-install setup scripts for **Zorin OS** (Linux) and **macOS**. Installs apps, applies system config, and sets up a dev environment in one run.

---

## Linux (Zorin OS)

### Quick start

```bash
sudo apt install -y curl && curl -sL https://raw.githubusercontent.com/lucasrainett/autoinstall/master/bootstrap.sh | bash
```

### Options

```bash
./script.sh                     # Install everything (interactive)
./script.sh --yes               # Install everything without prompts
./script.sh docker volta        # Install only specific apps
./script.sh --update            # Re-install/update all apps
./script.sh --update beeper     # Force update a specific app
./script.sh --dry-run           # Preview what would be installed
./script.sh --help              # Show help
```

### What it installs

| Category | Apps |
|---|---|
| Browsers | Zen Browser, Ungoogled Chromium, LibreWolf, Helium |
| Communication | Beeper, Signal, Proton Mail |
| Security | Proton Pass, Proton VPN, Cryptomator |
| Dev tools | JetBrains Toolbox, VSCodium, Volta (Node/pnpm), Docker, Claude Code, AWS CLI, Go, Rust, Python, Terraform, GitHub CLI |
| Media | VLC, OBS Studio, HandBrake, Parabolic, Grayjay |
| Creative | Boxy SVG, Minder |
| Gaming | Steam, Minecraft, Moonlight, Sunshine, Lutris, Heroic, Bottles, WinBoat |
| Productivity | OnlyOffice, Blanket |
| System | Mission Center, Angry IP Scanner, Flatseal, Warehouse, Extension Manager, GearLever, Solaar, Pods, DistroShelf, Boxes, Stream Controller, Tailscale |
| AI | LM Studio, Alpaca |
| 3D Printing | OrcaSlicer |
| Flatpak tools | GearLever, Flatseal, Warehouse, Bazaar |

**Config:** Dark theme, wallpaper, SSH key, git config, taskbar, dotfiles, GNOME extensions (Caffeine), GNOME settings backup/restore, firewall (ufw), power profile, telemetry disabled, system tweaks (inotify, swappiness, SSD TRIM, SSH hardening)

**Removes (optional):** Brave, LibreOffice, Thunderbird, Rhythmbox, Videos, Cheese, Shotwell, Maps, Weather, Simple Scan

---

## macOS

### Quick start

```bash
curl -sL https://raw.githubusercontent.com/lucasrainett/autoinstall/master/bootstrap_macos.sh | bash
```

### Options

```bash
./script_macos.sh                     # Install everything (interactive)
./script_macos.sh --yes               # Install everything without prompts
./script_macos.sh docker volta        # Install only specific apps
./script_macos.sh --update            # Re-install/update all apps
./script_macos.sh --update signal     # Force update a specific app
./script_macos.sh --dry-run           # Preview what would be installed
./script_macos.sh --help              # Show help
```

### What it installs

| Category | Apps |
|---|---|
| Browsers | Zen Browser, Ungoogled Chromium, Helium |
| Communication | Beeper, Signal, Proton Mail |
| Security | Proton Pass, Proton VPN, Cryptomator |
| Dev tools | JetBrains Toolbox, VSCodium, Volta (Node/pnpm), Docker Desktop, Claude Code, AWS CLI, Go, Rust, Python, Terraform, GitHub CLI |
| Media | VLC, OBS Studio, HandBrake, Macabolic, Grayjay |
| Gaming | Steam, Minecraft, Moonlight, Sunshine, Heroic |
| Productivity | OnlyOffice, Blankie |
| System | Stats, UTM, Podman Desktop, Logi Options+, Stream Deck, Tailscale |
| AI | LM Studio |
| 3D Printing | OrcaSlicer |

**Config:** Dark mode, wallpaper, graphite accent, SSH key (with Keychain), git config (osxkeychain), Dock layout, dotfiles, telemetry disabled, Finder tweaks, keyboard/trackpad settings, firewall enabled

**Removes (optional):** GarageBand (~1.5GB), iMovie (~2.4GB), Keynote, Pages, Numbers

---

## Features

- **Interactive** — Each step shows a description and asks to confirm (`Y/n/a`)
- **Skip installed** — Each script checks if the app is already present
- **Continue on failure** — A failed step won't block the rest
- **Selective install** — Pass app names as arguments to install only those
- **Update mode** — `--update` re-downloads and re-installs apps
- **Auto mode** — `--yes` skips all prompts for unattended installs
- **Dry run** — `--dry-run` previews all steps with descriptions
- **Logging** — Full output saved to `~/.autoinstall.log`
- **Summary report** — Shows installed, skipped, and failed apps at the end
- **Desktop shortcuts** — (Linux) Creates trusted `.desktop` shortcuts on the desktop

## Structure

```
script.sh                # Linux entry point
script_macos.sh          # macOS entry point
bootstrap.sh             # Linux one-liner bootstrap
bootstrap_macos.sh       # macOS one-liner bootstrap
installers/              # Linux installer scripts
  flatpak/               #   Flatpak apps
  appimage/              #   AppImage apps (integrated via GearLever)
  deb/                   #   .deb packages
  apt/                   #   apt repo packages
  other/                 #   Custom installs (Volta, JetBrains, Go, Rust)
  config/                #   System config (theme, SSH, git, GNOME)
  remove/                #   Pre-installed app removal
installers_macos/        # macOS installer scripts
  brew/                  #   Homebrew formulae (CLI tools)
  cask/                  #   Homebrew casks (GUI apps)
  other/                 #   Custom installs (Volta, Rust, Claude Code)
  config/                #   System config (theme, SSH, git, Dock)
  remove/                #   Pre-installed app removal
dotfiles/                # Shell aliases and config files
wallpapers/              # Desktop wallpapers
```

## Adding an app

Create a script in the appropriate folder:

```bash
#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.example.App &>/dev/null && echo "App already installed, skipping." && exit 0
flatpak install com.example.App -y --noninteractive
```

Then add it to the `STEPS` array in `script.sh` (or `script_macos.sh`):

```
"App Name|flatpak/install_app.sh|Short description of what the app does"
```

## GNOME settings (Linux only)

On first run, `install_gnome_settings.sh` exports your current GNOME settings to `dotfiles/gnome-settings.ini`. Review, customize, and commit this file. On subsequent runs, it restores those settings automatically.
