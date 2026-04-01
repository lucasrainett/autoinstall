# Current Laptop vs Autoinstall Script - Differences

Generated on 2026-04-01 by comparing the current laptop state against the autoinstall script.

---

## Apps Installed Now but NOT in Script

### Homebrew Casks (new)

| App | Cask Name |
|-----|-----------|
| Claude (Desktop) | `claude` |
| DBeaver | `dbeaver-community` |
| Ghostty | `ghostty` |
| Notion | `notion` |
| Proton Drive | `proton-drive` |
| Android Platform Tools | `android-platform-tools` |
| WailBrew | `wailbrew` |

### Homebrew Formulae (new)

| Formula | Notes |
|---------|-------|
| `payload-dumper-go` | Android firmware extraction tool |

### Non-Homebrew Apps (installed manually via DMG or other methods)

| App | Install Method |
|-----|---------------|
| DaVinci Resolve | DMG from Blackmagic website |
| Blackmagic RAW Player | Comes with DaVinci Resolve |
| Blackmagic Proxy Generator Lite | DMG from Blackmagic website |
| Balsamiq Wireframes | DMG or direct download |
| Epic Games Launcher | DMG from Epic |
| GPG Keychain (GPG Suite) | DMG from gpgtools.org |
| MarkText | DMG or direct download |
| moomoo.app | DMG or direct download |
| IntelliJ IDEA | Installed via JetBrains Toolbox (~/Applications) |

### Global npm Packages (new)

| Package | Notes |
|---------|-------|
| `openclaw` | Installed via Volta/npm, with zsh completions sourced in `~/.zshrc` |

### Other Tools (new)

| Tool | Notes |
|------|-------|
| Oh My Zsh | Installed via install script, theme: `robbyrussell`, plugins: `git` |
| LM Studio CLI (`lms`) | Installed via LM Studio app, PATH added to `~/.zshrc` |
| GPG/MacGPG2 | Installed at `/usr/local/bin/gpg` (not via Homebrew) |

---

## Apps in Script but NOT Currently Installed

### Homebrew Casks (missing)

| App | Cask Name |
|-----|-----------|
| Docker Desktop | `docker-desktop` |
| VLC | `vlc` |
| HandBrake | `handbrake` |
| Moonlight | `moonlight` |
| Elgato Stream Deck | `elgato-stream-deck` |
| VSCodium | `vscodium` |
| UTM | `utm` |
| Podman Desktop | `podman-desktop` |
| Minecraft | `minecraft` |
| Heroic Games Launcher | `heroic` |
| OrcaSlicer | `orcaslicer` |
| Helium | `helium` |
| Blankie | `blankie` |
| Macabolic | `macabolic` |

### Homebrew Formulae (missing)

| Formula | Notes |
|---------|-------|
| `git` | Using Xcode built-in git instead |
| `curl` | Using system curl |
| `tree` | Not installed |
| `htop` | Not installed |
| `tmux` | Not installed |
| `unzip` | Using system unzip |
| `coreutils` | Not installed |
| `gnu-sed` | Not installed |
| `grep` (GNU) | Not installed |
| `make` | Using system make |
| `cmake` | Not installed |
| `openssl` | Not installed (Homebrew version) |
| `readline` | Not installed |
| `python` (Homebrew) | Using system Python 3.9.6 instead |

### Homebrew Taps (missing)

| Tap | Used For |
|-----|----------|
| `LizardByte/homebrew` | Sunshine |
| `alinuxpengui/macabolic` | Macabolic |

### CLI Tools (missing)

| Tool | Notes |
|------|-------|
| Terraform | Not installed |
| GitHub CLI (`gh`) | Not installed |
| Sunshine | Not installed |
| AWS CLI | Not installed |
| Go | Not installed |
| Rust/rustup | Not installed |

---

## Dock Differences

### Script sets these pinned apps:

Terminal, Zen Browser, Beeper, Proton Pass, Proton Mail, Signal

### Currently pinned apps:

Apps (Launchpad), Ghostty, Proton Pass, Grayjay, Zen, Proton Mail, Beeper Desktop, Claude

### Changes needed in script:

| Change | Details |
|--------|---------|
| Remove | `Terminal` (replaced by Ghostty) |
| Remove | `Signal` (no longer pinned) |
| Add | `Apps` (Launchpad) |
| Add | `Ghostty` |
| Add | `Grayjay` |
| Add | `Claude` |
| Reorder | New order: Apps, Ghostty, Proton Pass, Grayjay, Zen, Proton Mail, Beeper, Claude |

---

## System Preferences Differences

| Setting | Script Value | Current Value | Notes |
|---------|-------------|---------------|-------|
| `AppleShowAllExtensions` | `true` | Not set (macOS default: off) | Script sets it but currently not applied |
| `NSQuitAlwaysKeepsWindows` | `false` | Not set (macOS default) | Script sets it but currently not applied |
| `com.apple.mouse.tapBehavior` | `1` | Not set (macOS default) | Script sets it but currently not applied |
| `allowIdentifierForAdvertising` | `false` | `true` (enabled) | Script disables it, but it is currently enabled |
| Terminal default profile | `Pro` | `Clear Dark` | Changed to a different profile |

All other defaults from the script match the current state (Finder settings, keyboard repeat, trackpad tap-to-click, screenshots, dark mode, graphite accent color, etc.).

---

## Shell and Dotfiles Differences

| Item | Script Sets Up | Current State | Action Needed |
|------|---------------|---------------|---------------|
| `~/.bash_aliases` | Created with aliases | Does not exist | File is missing |
| `~/.bashrc` | Created with alias sourcing | Does not exist | File is missing |
| `~/.zshrc` | Adds alias sourcing + Volta + Go PATH | Has Oh My Zsh + Volta + LM Studio CLI PATH + OpenClaw completions | Script needs to add Oh My Zsh install, LM Studio PATH, OpenClaw completions |
| `~/.zprofile` | Not managed by script | Has Homebrew shellenv + JetBrains Toolbox PATH | Consider adding to script |
| Oh My Zsh | Not in script | Installed with `robbyrussell` theme and `git` plugin | Add Oh My Zsh installation step |

### Current `~/.zshrc` contents:

```bash
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="robbyrussell"
plugins=(git)
source $ZSH/oh-my-zsh.sh
export PATH="$HOME/.local/bin:$PATH"
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"
export PATH="$HOME/.volta/tools/image/node/24.14.0/bin:$PATH"
export PATH="$PATH:$HOME/.lmstudio/bin"
source "$HOME/.openclaw/completions/openclaw.zsh"
```

### Current `~/.zprofile` contents:

```bash
eval "$(/opt/homebrew/bin/brew shellenv zsh)"
export PATH="$PATH:$HOME/Library/Application Support/JetBrains/Toolbox/scripts"
```

---

## Desktop Widgets (not in script at all)

7 widgets currently configured on the desktop:

| Widget | Size | Details |
|--------|------|---------|
| Weather | Small | "My Location" |
| Calendar (Month View) | Small | Month calendar |
| World Clock (Analog) | Medium | 4 cities: Singapore, Brasilia, Auckland, New York |
| Batteries | Medium | Battery status for connected devices |
| World Clock (Digital) | Small | Singapore only |
| Calendar (Date) | Small | Today's date |
| Stocks Overview | Large | "My Symbols" watchlist |

Widget configuration is stored in binary plists under `com.apple.notificationcenterui` and is difficult to automate via `defaults write`. Consider documenting this as a manual step or explore using `defaults export/import com.apple.notificationcenterui`.

---

## Login Items (not in script)

Currently configured login items:

- ProtonVPN
- Beeper Desktop
- Stats
- Steam
- Notion

None of these are set up by the script. Consider adding `osascript` commands to configure login items.

---

## User Launch Agents (not in script)

| Agent Plist | Purpose |
|-------------|---------|
| `ai.openclaw.gateway.plist` | OpenClaw background service |
| `com.epicgames.launcher.plist` | Epic Games Launcher |
| `com.valvesoftware.steamclean.plist` | Steam cleanup |

---

## Other Differences

| Item | Script | Current | Notes |
|------|--------|---------|-------|
| Computer name | Not configured | Custom name set | Consider adding `scutil --set ComputerName/LocalHostName` |
| FileVault | Not configured | Enabled | Consider adding `fdesetup enable` |
| Wallpaper file | `PaulsHardware8BitLogosChristmas.png` | Same file exists in `~/Pictures/Wallpapers/` | Matches |
| Git config | Managed | Matches script exactly | No change needed |
| SSH config | Managed | Matches script exactly | No change needed |

---

## Summary of Recommended Script Changes

1. **Add 7 new Homebrew casks**: `claude`, `dbeaver-community`, `ghostty`, `notion`, `proton-drive`, `android-platform-tools`, `wailbrew`
2. **Add 1 new formula**: `payload-dumper-go`
3. **Add manual/DMG install steps** for: DaVinci Resolve, Balsamiq Wireframes, Epic Games Launcher, GPG Suite, MarkText, moomoo
4. **Add Oh My Zsh** installation step (with `robbyrussell` theme and `git` plugin)
5. **Add OpenClaw** as a global npm package (`npm install -g openclaw`) and set up zsh completions
6. **Add LM Studio CLI** PATH setup to shell config
7. **Update Dock** pinned apps to: Apps, Ghostty, Proton Pass, Grayjay, Zen, Proton Mail, Beeper, Claude
8. **Update Terminal** default profile from `Pro` to `Clear Dark`
9. **Add login items**: ProtonVPN, Beeper Desktop, Stats, Steam, Notion
10. **Fix `allowIdentifierForAdvertising`** to `false` (currently `true`, script intends `false`)
11. **Remove or mark as optional** 14 casks no longer installed (Docker, VLC, Heroic, etc.)
12. **Remove or mark as optional** many CLI tools no longer installed (Go, Rust, Terraform, gh, etc.)
13. **Document desktop widgets** as a manual configuration step (7 widgets listed above)
14. **Add `~/.zprofile`** setup for Homebrew shellenv and JetBrains Toolbox PATH
15. **Consider adding**: FileVault enable, computer name setup via `scutil`
