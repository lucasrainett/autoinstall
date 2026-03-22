#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLERS_DIR="$SCRIPT_DIR/installers_macos"
LOG_FILE="$HOME/.autoinstall.log"

# ── flags ──────────────────────────────────────────────────────
export AUTOINSTALL_UPDATE=false
DRY_RUN=false
AUTO_YES=false
SELECTED_APPS=()

for arg in "$@"; do
    case "$arg" in
        --update)  AUTOINSTALL_UPDATE=true ;;
        --dry-run) DRY_RUN=true ;;
        --yes)     AUTO_YES=true ;;
        --help)
            echo "Usage: ./script_macos.sh [options] [app names...]"
            echo ""
            echo "Options:"
            echo "  --update    Re-install apps even if already present"
            echo "  --dry-run   Show what would be installed without doing anything"
            echo "  --yes       Skip confirmation prompts, install everything"
            echo "  --help      Show this help"
            echo ""
            echo "Examples:"
            echo "  ./script_macos.sh                   Install everything (interactive)"
            echo "  ./script_macos.sh --yes             Install everything without prompts"
            echo "  ./script_macos.sh docker volta      Install only Docker and Volta"
            echo "  ./script_macos.sh --update signal   Force re-install Signal"
            echo "  ./script_macos.sh --dry-run         Preview all steps"
            exit 0
            ;;
        *)  SELECTED_APPS+=("$(echo "$arg" | tr '[:upper:]' '[:lower:]')") ;;
    esac
done

# ── steps (Name|script|Description) ──────────────────────────
STEPS=(
    # ── system config & security ──
    "Disable Telemetry|config/install_disable_telemetry.sh|Disable Apple diagnostics, Siri analytics, ad tracking, and smart quotes"
    "System Tweaks|config/install_system_tweaks.sh|Finder: show hidden files, extensions, path bar, folders first. Keyboard: fast repeat, no auto-correct. Trackpad: tap to click. Screenshots: save to ~/Screenshots. Enable firewall"
    "Theme|config/install_theme.sh|Apply dark mode, custom wallpaper, and graphite accent color"
    "SSH Key|config/install_ssh.sh|Generate an ED25519 SSH key and add to macOS Keychain"
    "Git Config|config/install_git_config.sh|Set git user name, email, default branch, and osxkeychain credential helper"
    "Dotfiles|config/install_dotfiles.sh|Deploy shell aliases and dotfiles, hook into .zshrc and .bashrc"
    "Dock|config/install_dock.sh|Auto-hide Dock, set icon size, pin favorite apps, remove recents"

    # ── removals (pre-installed apps) ──
    "Remove GarageBand|remove/install_remove_garageband.sh|Uninstall GarageBand and its sound library (~1.5GB)"
    "Remove iMovie|remove/install_remove_imovie.sh|Uninstall iMovie video editor (~2.4GB, replaced by HandBrake/OBS)"
    "Remove Keynote|remove/install_remove_keynote.sh|Uninstall Keynote presentations (replaced by OnlyOffice)"
    "Remove Pages|remove/install_remove_pages.sh|Uninstall Pages word processor (replaced by OnlyOffice)"
    "Remove Numbers|remove/install_remove_numbers.sh|Uninstall Numbers spreadsheets (replaced by OnlyOffice)"

    # ── brew formulae (CLI tools & services) ──
    "Common Tools|brew/install_common_tools.sh|Install essential CLI tools: git, curl, jq, htop, tmux, coreutils, cmake, etc."
    "Docker|cask/install_docker.sh|Container platform for building, shipping, and running applications"
    "Tailscale|cask/install_tailscale.sh|Zero-config VPN using WireGuard for secure private networking"
    "Python|brew/install_python.sh|Python 3 programming language with pip package manager"
    "Terraform|brew/install_terraform.sh|Infrastructure as code tool for provisioning cloud resources"
    "GitHub CLI|brew/install_github_cli.sh|Official GitHub CLI for managing repos, PRs, and issues from the terminal"
    "Sunshine|brew/install_sunshine.sh|Self-hosted game stream host — stream this Mac to Moonlight clients (experimental)"

    # ── brew cask apps (GUI applications) ──
    "VLC|cask/install_vlc.sh|Versatile media player supporting almost every audio and video format"
    "Signal|cask/install_signal.sh|End-to-end encrypted messaging app for private communication"
    "OnlyOffice|cask/install_onlyoffice.sh|Office suite compatible with MS Office formats (docs, sheets, slides)"
    "Zen Browser|cask/install_zen_browser.sh|Privacy-first browser built on Firefox with a minimal UI"
    "Ungoogled Chromium|cask/install_ungoogled_chromium.sh|Chromium browser with Google services and tracking removed"
    "OBS Studio|cask/install_obs.sh|Screen recording and live streaming software"
    "HandBrake|cask/install_handbrake.sh|Video transcoder — convert videos between formats and compress them"
    "Moonlight|cask/install_moonlight.sh|Game streaming client — play PC games on other devices via network"
    "Logi Options+|cask/install_logi_options.sh|Official Logitech device manager for mice, keyboards, and trackpads"
    "Stream Deck|cask/install_stream_deck.sh|Official Elgato Stream Deck app for programmable macro keys"
    "VSCodium|cask/install_vscodium.sh|VS Code without Microsoft telemetry — free, open-source code editor"
    "Proton VPN|cask/install_proton_vpn.sh|Privacy-focused VPN by Proton with no-logs policy"
    "Proton Pass|cask/install_proton_pass.sh|End-to-end encrypted password manager by Proton"
    "Proton Mail|cask/install_proton_mail.sh|End-to-end encrypted email client by Proton"
    "LM Studio|cask/install_lmstudio.sh|Run local AI language models offline — download, manage, and chat"
    "Cryptomator|cask/install_cryptomator.sh|Client-side encryption for cloud storage (Dropbox, GDrive, iCloud, etc.)"
    "Mission Center|cask/install_mission_center.sh|Menu bar system monitor showing CPU, RAM, disk, and network usage"
    "UTM|cask/install_utm.sh|Virtual machine manager — run Windows, Linux, and other OSes on your Mac"
    "Podman Desktop|cask/install_podman_desktop.sh|Graphical container manager for Podman images and running containers"
    "JetBrains Toolbox|cask/install_jetbrains_toolbox.sh|Manage and update JetBrains IDEs (IntelliJ, WebStorm, GoLand, etc.)"
    "Steam|cask/install_steam.sh|Valve's PC gaming platform — game store, library, and community"
    "Minecraft|cask/install_minecraft.sh|Sandbox game — build, explore, and survive in blocky worlds"
    "Heroic Games Launcher|cask/install_heroic.sh|Open-source launcher for Epic Games Store and GOG games"
    "OrcaSlicer|cask/install_orca_slicer.sh|3D printer slicer for converting models to G-code (FDM printers)"
    "Grayjay|cask/install_grayjay.sh|Multi-platform video player aggregating YouTube, Twitch, and more"
    "Helium|cask/install_helium.sh|Lightweight web browser with built-in media download features"
    "Blankie|cask/install_blankie.sh|Ambient sound mixer for focus, relaxation, or sleep"
    "Macabolic|cask/install_macabolic.sh|Video and audio downloader — native macOS port of Parabolic"
    "Beeper|cask/install_beeper.sh|Unified messaging — combine iMessage, WhatsApp, Telegram, Slack in one app"

    # ── dev tools ──
    "Volta|other/install_volta.sh|JavaScript tool manager — install and switch Node.js/pnpm versions per project"
    "Claude Code|other/install_claude.sh|AI coding assistant by Anthropic for the terminal"
    "AWS CLI|other/install_aws_cli.sh|Official command line interface for Amazon Web Services"
    "Go|other/install_go.sh|Fast, statically typed language by Google for building scalable systems"
    "Rust|other/install_rust.sh|Systems programming language focused on safety, speed, and concurrency"

    # ── cleanup (always last) ──
    "Cleanup Downloads|config/install_cleanup_downloads.sh|Remove leftover installer files (.dmg, .pkg, .tar.gz) from Downloads"
)

TOTAL=${#STEPS[@]}

# ── tracking ───────────────────────────────────────────────────
PASSED=()
FAILED=()
SKIPPED=()

# ── logging ────────────────────────────────────────────────────
echo "" >> "$LOG_FILE"
echo "════════════════════════════════════════════════════════════" >> "$LOG_FILE"
echo "autoinstall (macOS) started at $(date)" >> "$LOG_FILE"
echo "args: $*" >> "$LOG_FILE"
echo "════════════════════════════════════════════════════════════" >> "$LOG_FILE"

log() {
    echo "$1" | tee -a "$LOG_FILE"
}

# ── confirmation prompt ───────────────────────────────────────
confirm() {
    if $AUTO_YES; then
        return 0
    fi
    while true; do
        read -rp "  Install? [Y/n/a] " answer </dev/tty
        case "${answer,,}" in
            ""|y|yes) return 0 ;;
            n|no)     return 1 ;;
            a|all)    AUTO_YES=true; return 0 ;;
            *)        echo "  Please answer y (yes), n (no), or a (yes to all)" ;;
        esac
    done
}

# ── system requirements check ──────────────────────────────────
check_requirements() {
    log ""
    log "Checking system requirements..."

    # macOS check
    if [ "$(uname)" != "Darwin" ]; then
        log "ERROR: This script is for macOS only."
        exit 1
    fi
    log "  macOS: OK"

    # internet
    if ! curl -s --head --max-time 5 https://github.com &>/dev/null; then
        log "ERROR: No internet connection detected."
        exit 1
    fi
    log "  Internet: OK"

    # disk space (need at least 10GB free)
    FREE_GB=$(df -g / | tail -1 | awk '{print $4}')
    if [ "$FREE_GB" -lt 10 ]; then
        log "ERROR: Less than 10GB free disk space ($FREE_GB GB available)."
        exit 1
    fi
    log "  Disk space: ${FREE_GB}GB free - OK"

    # Homebrew
    if ! command -v brew &>/dev/null; then
        log "  Homebrew not found, installing..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        # add to PATH for Apple Silicon
        if [ -f /opt/homebrew/bin/brew ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
    fi
    log "  Homebrew: OK"

    log "System requirements: OK"
}

# ── selective install filter ───────────────────────────────────
should_run() {
    local name="$(echo "$1" | tr '[:upper:]' '[:lower:]')"
    if [ ${#SELECTED_APPS[@]} -eq 0 ]; then
        return 0
    fi
    for app in "${SELECTED_APPS[@]}"; do
        if [[ "$name" == *"$app"* ]]; then
            return 0
        fi
    done
    return 1
}

# ── parse step fields ─────────────────────────────────────────
get_name()  { echo "${1%%|*}"; }
get_script() { local tmp="${1#*|}"; echo "${tmp%%|*}"; }
get_desc()  { echo "${1##*|}"; }

# ── main ───────────────────────────────────────────────────────
if $DRY_RUN; then
    log "DRY RUN - no changes will be made"
    log ""
    for i in "${!STEPS[@]}"; do
        NAME=$(get_name "${STEPS[$i]}")
        DESC=$(get_desc "${STEPS[$i]}")
        PROGRESS=$(( (i * 100) / TOTAL ))
        if should_run "$NAME"; then
            log "  [$PROGRESS%] ($((i + 1))/$TOTAL) $NAME - $DESC"
        else
            log "  [$PROGRESS%] ($((i + 1))/$TOTAL) SKIP (not selected): $NAME"
        fi
    done
    log ""
    log "[100%] Dry run complete."
    exit 0
fi

check_requirements

log ""
log "Requesting sudo privileges..."
sudo -v
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &
keepalive_pid=$!

for i in "${!STEPS[@]}"; do
    NAME=$(get_name "${STEPS[$i]}")
    SCRIPT=$(get_script "${STEPS[$i]}")
    DESC=$(get_desc "${STEPS[$i]}")
    PROGRESS=$(( (i * 100) / TOTAL ))

    if ! should_run "$NAME"; then
        SKIPPED+=("$NAME (not selected)")
        continue
    fi

    log ""
    log "[$PROGRESS%] ($((i + 1))/$TOTAL) $NAME"
    log "  $DESC"

    if ! confirm; then
        SKIPPED+=("$NAME (declined)")
        continue
    fi

    if "$INSTALLERS_DIR/$SCRIPT" 2>&1 | tee -a "$LOG_FILE"; then
        # check if it was skipped (script printed "skipping")
        if tail -5 "$LOG_FILE" | grep -qi "skipping"; then
            SKIPPED+=("$NAME")
        else
            PASSED+=("$NAME")
        fi
    else
        log "  FAILED: $NAME (continuing...)"
        FAILED+=("$NAME")
    fi
done

# ── summary ────────────────────────────────────────────────────
log ""
log "════════════════════════════════════════════════════════════"
log "                    INSTALL SUMMARY"
log "════════════════════════════════════════════════════════════"
log ""

if [ ${#PASSED[@]} -gt 0 ]; then
    log "INSTALLED (${#PASSED[@]}):"
    for item in "${PASSED[@]}"; do log "  + $item"; done
    log ""
fi

if [ ${#SKIPPED[@]} -gt 0 ]; then
    log "SKIPPED (${#SKIPPED[@]}):"
    for item in "${SKIPPED[@]}"; do log "  - $item"; done
    log ""
fi

if [ ${#FAILED[@]} -gt 0 ]; then
    log "FAILED (${#FAILED[@]}):"
    for item in "${FAILED[@]}"; do log "  ! $item"; done
    log ""
fi

log "Log saved to $LOG_FILE"
log "[100%] All done!"

sudo -k
kill "$keepalive_pid" 2>/dev/null
