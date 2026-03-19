# autoinstall

Post-install setup script for Zorin OS. Installs apps, applies theme, and configures the system in one run.

## Quick start

```bash
sudo apt install -y curl && curl -sL https://raw.githubusercontent.com/lucasrainett/autoinstall/master/bootstrap.sh | bash
```

Safe to re-run — already installed apps are skipped, and failures won't stop the rest.

## Options

```bash
./script.sh                     # Install everything
./script.sh docker volta        # Install only specific apps
./script.sh --update            # Re-install/update all apps
./script.sh --update beeper     # Force update a specific app
./script.sh --dry-run           # Preview what would be installed
./script.sh --help              # Show help
```

## What it does

**Config:** Theme/wallpaper, dark mode, SSH key, git config, taskbar favorites, dotfiles, GNOME extensions (Caffeine), GNOME settings backup/restore, firewall (ufw)

**Apps:**

| Category | Apps |
|---|---|
| Browsers | Zen Browser, Ungoogled Chromium, LibreWolf |
| Communication | Beeper, Signal, Proton Mail |
| Security | Proton Pass, Proton VPN, Cryptomator |
| Dev tools | JetBrains Toolbox, VSCodium, Volta (Node/pnpm), Docker, Bruno |
| Media | VLC, OBS Studio, HandBrake, Parabolic, Grayjay, Helium |
| Creative | Boxy SVG |
| Gaming | Steam, Minecraft, Moonlight, WinBoat |
| Productivity | OnlyOffice, Minder, Blanket |
| System | Mission Center, Angry IP Scanner, Flatseal, Warehouse, Extension Manager, GearLever, Solaar, Pods, DistroShelf, Boxes |
| Finance | Exodus |
| 3D Printing | OrcaSlicer |
| AI | LM Studio, Alpaca |
| Streaming | Stream Controller |

**Removes:** Brave, LibreOffice

## Features

- **Skip installed** — Each script checks if the app is already present
- **Continue on failure** — A failed step won't block the rest
- **Selective install** — Pass app names as arguments to install only those
- **Update mode** — `--update` re-downloads and re-installs apps
- **Dry run** — `--dry-run` previews all steps without changes
- **Batch flatpak** — All flatpak apps are pre-installed in a single batch for speed
- **Logging** — Full output saved to `~/.autoinstall.log`
- **Summary report** — Shows installed, skipped, and failed apps at the end
- **System check** — Verifies internet, disk space, and Flathub before starting

## Structure

```
script.sh              # Entry point with orchestration
bootstrap.sh           # One-liner bootstrap (downloads and runs)
installers/
  flatpak/             # Flatpak apps
  appimage/            # AppImage apps (integrated via GearLever)
  deb/                 # .deb packages (Proton Pass, Proton Mail)
  apt/                 # apt packages (Docker, firewall, common tools)
  other/               # Custom installs (JetBrains Toolbox, Volta)
  config/              # System config (theme, SSH, git, taskbar, dotfiles, GNOME)
  remove/              # App removal (Brave, LibreOffice)
dotfiles/              # Shell aliases and config files
```

## Adding an app

Create a new script in the appropriate folder:

```bash
#!/usr/bin/env bash
[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.example.App &>/dev/null && echo "App already installed, skipping." && exit 0
flatpak install com.example.App -y --noninteractive
```

Then add it to the `STEPS` array in `script.sh`.

## GNOME settings

On first run, `install_gnome_settings.sh` exports your current GNOME settings to `dotfiles/gnome-settings.ini`. Review, customize, and commit this file. On subsequent runs, it restores those settings automatically.
