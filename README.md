# autoinstall

Post-install setup script for Zorin OS. Installs apps, applies theme, and configures the system in one run.

## Quick start

```bash
sudo apt install -y curl && curl -sL https://raw.githubusercontent.com/lucasrainett/autoinstall/master/bootstrap.sh | bash
```

Safe to re-run — already installed apps are skipped, and failures won't stop the rest.

## What it does

**Config:** Theme/wallpaper, dark mode, SSH key, taskbar favorites

**Apps:**

| Category | Apps |
|---|---|
| Browsers | Zen Browser, Ungoogled Chromium, LibreWolf |
| Communication | Beeper, Signal, Proton Mail |
| Security | Proton Pass, Proton VPN, Cryptomator |
| Dev tools | JetBrains Toolbox, VSCodium, Volta (Node/pnpm), Docker, Bruno |
| Media | VLC, OBS Studio, HandBrake, Parabolic, Grayjay, Helium |
| Creative | Boxy SVG, Inkscape |
| Gaming | Steam, Minecraft, Moonlight, WinBoat |
| Productivity | OnlyOffice, Obsidian, Minder, Blanket |
| System | Mission Center, Angry IP Scanner, Flatseal, Warehouse, Extension Manager, GearLever, Solaar, Pods, DistroShelf, Boxes |
| Finance | Exodus |
| 3D Printing | OrcaSlicer |
| Streaming | Stream Controller, LM Studio, Alpaca |

**Removes:** Brave, LibreOffice

## Structure

```
script.sh              # Entry point
installers/
  flatpak/             # Flatpak apps
  appimage/            # AppImage apps (integrated via GearLever)
  deb/                 # .deb packages (Proton Pass, Proton Mail)
  apt/                 # apt packages (Docker)
  other/               # Custom installs (JetBrains Toolbox, Volta)
  config/              # System config (theme, SSH, taskbar)
  remove/              # App removal (Brave, LibreOffice)
```

## Adding an app

Create a new script in the appropriate folder:

```bash
#!/usr/bin/env bash
flatpak info com.example.App &>/dev/null && echo "App already installed, skipping." && exit 0
flatpak install com.example.App -y --noninteractive
```

Then add it to the `STEPS` array in `script.sh`.
