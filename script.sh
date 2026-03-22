#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLERS_DIR="$SCRIPT_DIR/installers"
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
            echo "Usage: ./script.sh [options] [app names...]"
            echo ""
            echo "Options:"
            echo "  --update    Re-install apps even if already present"
            echo "  --dry-run   Show what would be installed without doing anything"
            echo "  --yes       Skip confirmation prompts, install everything"
            echo "  --help      Show this help"
            echo ""
            echo "Examples:"
            echo "  ./script.sh                   Install everything (interactive)"
            echo "  ./script.sh --yes             Install everything without prompts"
            echo "  ./script.sh docker volta      Install only Docker and Volta"
            echo "  ./script.sh --update beeper   Force re-install Beeper"
            echo "  ./script.sh --dry-run         Preview all steps"
            exit 0
            ;;
        *)  SELECTED_APPS+=("${arg,,}") ;;
    esac
done

# ── steps (Name|script|Description) ──────────────────────────
STEPS=(
    # ── system config & security ──
    "Disable Telemetry|config/install_disable_telemetry.sh|Disable Ubuntu telemetry, crash reporting, and tracking services"
    "Power Profile|config/install_power_profile.sh|Set system power profile to performance mode"
    "System Tweaks|config/install_system_tweaks.sh|Tune inotify watchers, swappiness, file limits, SSD TRIM, SSH hardening, fixed workspaces"
    "Theme|config/install_theme.sh|Apply dark theme, custom wallpaper, and ZorinGrey-Dark icons"
    "SSH Key|config/install_ssh.sh|Generate an ED25519 SSH key for GitHub authentication"
    "Git Config|config/install_git_config.sh|Set git user name, email, default branch, and pull strategy"
    "Dotfiles|config/install_dotfiles.sh|Deploy shell aliases and dotfiles from the repo"
    "GNOME Settings|config/install_gnome_settings.sh|Export or restore GNOME desktop settings (dconf)"
    "GNOME Extensions|config/install_gnome_extensions.sh|Install GNOME Shell extensions (Caffeine)"
    "Taskbar|config/install_taskbar.sh|Configure GNOME taskbar layout and pinned apps"

    # ── system packages & services ──
    "Common Tools|apt/install_common_tools.sh|Install essential CLI tools: git, curl, htop, build-essential, gnupg, etc."
    "Firewall|apt/install_firewall.sh|Install and enable UFW firewall with sensible defaults"
    "Docker|apt/install_docker.sh|Container platform for building, shipping, and running applications"
    "Tailscale|apt/install_tailscale.sh|Zero-config VPN using WireGuard, with exit node firewall rules"
    "Python|apt/install_python.sh|Install Python 3 with pip, venv, and dev headers"
    "Terraform|apt/install_terraform.sh|Infrastructure as code tool for provisioning cloud resources"
    "GitHub CLI|apt/install_github_cli.sh|Official GitHub CLI for managing repos, PRs, and issues from the terminal"

    # ── removals (pre-installed apps) ──
    "Remove Brave|remove/install_remove_brave.sh|Uninstall Brave browser and its repo/keys"
    "Remove LibreOffice|remove/install_remove_libreoffice.sh|Uninstall LibreOffice suite (replaced by OnlyOffice)"
    "Remove Thunderbird|remove/install_remove_thunderbird.sh|Uninstall Thunderbird email client (replaced by Proton Mail)"
    "Remove Rhythmbox|remove/install_remove_rhythmbox.sh|Uninstall Rhythmbox music player"
    "Remove Videos|remove/install_remove_totem.sh|Uninstall GNOME Videos/Totem (replaced by VLC)"
    "Remove Cheese|remove/install_remove_cheese.sh|Uninstall Cheese webcam app"
    "Remove Shotwell|remove/install_remove_shotwell.sh|Uninstall Shotwell photo manager"
    "Remove Maps|remove/install_remove_maps.sh|Uninstall GNOME Maps"
    "Remove Weather|remove/install_remove_weather.sh|Uninstall GNOME Weather"
    "Remove Simple Scan|remove/install_remove_simple_scan.sh|Uninstall Simple Scan document scanner"

    # ── dev tools ──
    "Volta|other/install_volta.sh|JavaScript tool manager — install and switch Node.js/pnpm versions per project"
    "Claude Code|other/install_claude.sh|AI coding assistant by Anthropic for the terminal"
    "AWS CLI|other/install_aws_cli.sh|Official command line interface for Amazon Web Services"
    "Go|other/install_go.sh|Fast, statically typed language by Google for building scalable systems"
    "Rust|other/install_rust.sh|Systems programming language focused on safety, speed, and concurrency"
    "JetBrains Toolbox|other/install_jetbrains_toolbox.sh|Manage and update JetBrains IDEs (IntelliJ, WebStorm, GoLand, etc.)"

    # ── flatpak apps (GearLever first, needed by AppImages) ──
    "GearLever|flatpak/install_gearlever.sh|AppImage manager — integrate, update, and organize AppImage files"
    "Flatseal|flatpak/install_flatseal.sh|Manage Flatpak app permissions (filesystem, network, devices)"
    "Warehouse|flatpak/install_warehouse.sh|Manage installed Flatpak apps, runtimes, and leftover data"
    "Extension Manager|flatpak/install_extension_manager.sh|Browse, install, and manage GNOME Shell extensions"
    "VLC|flatpak/install_vlc.sh|Versatile media player supporting almost every audio and video format"
    "Signal|flatpak/install_signal.sh|End-to-end encrypted messaging app for private communication"
    "OnlyOffice|flatpak/install_onlyoffice.sh|Office suite compatible with MS Office formats (docs, sheets, slides)"
    "VSCodium|deb/install_vscodium.sh|VS Code without Microsoft telemetry — free, open-source code editor"
    "LibreWolf|flatpak/install_librewolf.sh|Privacy-focused Firefox fork with tracking protection built in"
    "Zen Browser|flatpak/install_zen_browser.sh|Privacy-first browser built on Firefox with a minimal UI"
    "Ungoogled Chromium|flatpak/install_ungoogled_chromium.sh|Chromium browser with Google services and tracking removed"
    "Boxes|flatpak/install_boxes.sh|GNOME virtual machine manager for running other operating systems"
    "DistroShelf|flatpak/install_distroshelf.sh|Manage Linux containers (distrobox) with a graphical interface"
    "Pods|flatpak/install_pods.sh|Graphical Podman container manager for images and running containers"
    "Mission Center|flatpak/install_mission_center.sh|System monitor showing CPU, RAM, disk, network, and GPU usage"
    "Angry IP Scanner|flatpak/install_angry_ip_scanner.sh|Fast network scanner for discovering hosts and open ports"
    "Solaar|flatpak/install_solaar.sh|Manage Logitech wireless devices (battery, buttons, DPI settings)"
    "Moonlight|flatpak/install_moonlight.sh|Game streaming client — play PC games on other devices via network"
    "Stream Controller|flatpak/install_stream_controller.sh|Elgato Stream Deck controller for Linux"
    "OBS Studio|flatpak/install_obs.sh|Screen recording and live streaming software"
    "HandBrake|flatpak/install_handbrake.sh|Video transcoder — convert videos between formats and compress them"
    "Parabolic|flatpak/install_parabolic.sh|Download videos and audio from YouTube and other sites"
    "Boxy SVG|flatpak/install_boxy_svg.sh|Vector graphics editor for creating SVG illustrations and icons"
    "Minder|flatpak/install_minder.sh|Mind mapping tool for organizing ideas and brainstorming"
    "Blanket|flatpak/install_blanket.sh|Ambient sound mixer for focus, relaxation, or sleep"
    "Alpaca|flatpak/install_alpaca.sh|Chat with local AI models (LLMs) through a simple interface"
    "Bazaar|flatpak/install_bazaar.sh|Browse and discover Flatpak apps from Flathub"
    "Grayjay|flatpak/install_grayjay.sh|Multi-platform video player aggregating YouTube, Twitch, and more"
    "OrcaSlicer|flatpak/install_orca_slicer.sh|3D printer slicer for converting models to G-code (FDM printers)"
    "Proton VPN|deb/install_proton_vpn.sh|Privacy-focused VPN by Proton with no-logs policy"
    "Lutris|flatpak/install_lutris.sh|Gaming platform for managing Windows games, emulators, and Wine"
    "Heroic Games Launcher|flatpak/install_heroic.sh|Open-source launcher for Epic Games Store and GOG games"
    "Bottles|flatpak/install_bottles.sh|Run Windows software and games on Linux using Wine environments"

    # ── gaming ──
    "Steam|deb/install_steam.sh|Valve's PC gaming platform — game store, library, and community"
    "Minecraft|flatpak/install_minecraft.sh|Sandbox game — build, explore, and survive in blocky worlds"
    "Sunshine|deb/install_sunshine.sh|Self-hosted game stream host — stream this PC to Moonlight clients"

    # ── deb & appimage apps ──
    "Proton Pass|deb/install_proton_pass.sh|End-to-end encrypted password manager by Proton"
    "Proton Mail|deb/install_proton_mail.sh|End-to-end encrypted email client by Proton"
    "Beeper|appimage/install_beeper.sh|Unified messaging — combine iMessage, WhatsApp, Telegram, Slack in one app"
    "LM Studio|appimage/install_lmstudio.sh|Run local AI language models offline — download, manage, and chat"
    "Cryptomator|appimage/install_cryptomator.sh|Client-side encryption for cloud storage (Dropbox, GDrive, etc.)"
    "Helium|appimage/install_helium.sh|Lightweight web browser with built-in media download features"
    "WinBoat|appimage/install_winboat.sh|Run Windows apps on Linux via Docker containers and RDP streaming"

    # ── cleanup (always last) ──
    "Cleanup Downloads|config/install_cleanup_downloads.sh|Remove leftover installer files (.deb, .tar.gz, .AppImage) from Downloads"
)

TOTAL=${#STEPS[@]}

# ── tracking ───────────────────────────────────────────────────
PASSED=()
FAILED=()
SKIPPED=()

# ── logging ────────────────────────────────────────────────────
echo "" >> "$LOG_FILE"
echo "════════════════════════════════════════════════════════════" >> "$LOG_FILE"
echo "autoinstall started at $(date)" >> "$LOG_FILE"
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

    # internet
    if ! curl -s --head --max-time 5 https://flathub.org &>/dev/null; then
        log "ERROR: No internet connection detected."
        exit 1
    fi
    log "  Internet: OK"

    # disk space (need at least 10GB free)
    FREE_GB=$(df -BG --output=avail / | tail -1 | tr -d ' G')
    if [ "$FREE_GB" -lt 10 ]; then
        log "ERROR: Less than 10GB free disk space ($FREE_GB GB available)."
        exit 1
    fi
    log "  Disk space: ${FREE_GB}GB free - OK"

    # flatpak remote
    if ! flatpak remotes | grep -q flathub; then
        log "  Flathub not configured, adding..."
        flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
    fi
    log "  Flathub: OK"

    log "System requirements: OK"
}

# ── selective install filter ───────────────────────────────────
should_run() {
    local name="${1,,}"
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
        SCRIPT=$(get_script "${STEPS[$i]}")
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

# ── create desktop shortcuts ──────────────────────────────────
SHORTCUTS_DIR="$HOME/Desktop"
log ""
log "Creating desktop shortcuts..."

SHORTCUT_COUNT=0
for entry in "${STEPS[@]}"; do
    NAME=$(get_name "$entry")
    SCRIPT=$(get_script "$entry")

    # skip non-launchable steps
    [[ "$SCRIPT" == config/* ]] && continue
    [[ "$SCRIPT" == remove/* ]] && continue
    [[ "$SCRIPT" == apt/* ]] && continue
    [[ "$SCRIPT" == other/install_volta.sh ]] && continue
    [[ "$SCRIPT" == other/install_claude.sh ]] && continue
    [[ "$SCRIPT" == other/install_aws_cli.sh ]] && continue
    [[ "$SCRIPT" == other/install_go.sh ]] && continue
    [[ "$SCRIPT" == other/install_rust.sh ]] && continue

    FILEPATH="$INSTALLERS_DIR/$SCRIPT"
    DESKTOP_SRC=""

    # flatpak apps: find .desktop by flatpak ID
    if [[ "$SCRIPT" == flatpak/* ]]; then
        FLATPAK_ID=$(grep -oP 'flatpak install \K\S+' "$FILEPATH" 2>/dev/null)
        if [ -n "$FLATPAK_ID" ] && flatpak info "$FLATPAK_ID" &>/dev/null; then
            DESKTOP_SRC=$(find /var/lib/flatpak/exports/share/applications -name "${FLATPAK_ID}.desktop" 2>/dev/null | head -1)
        fi
    # appimage apps: find .desktop created by GearLever
    elif [[ "$SCRIPT" == appimage/* ]]; then
        APP_SLUG=$(basename "$SCRIPT" .sh | sed 's/install_//')
        DESKTOP_SRC=$(find ~/.local/share/applications -iname "*${APP_SLUG}*" -name "*.desktop" 2>/dev/null | head -1)
    # deb/other apps: find .desktop by package name
    elif [[ "$SCRIPT" == deb/* || "$SCRIPT" == other/* ]]; then
        PKG=$(grep -oP 'sudo apt install -y \./\K\S+' "$FILEPATH" 2>/dev/null | head -1 | sed 's/\.deb//')
        if [ -n "$PKG" ]; then
            DESKTOP_SRC=$(find /usr/share/applications ~/.local/share/applications -iname "*${PKG}*" -name "*.desktop" 2>/dev/null | head -1)
        fi
        if [ -z "$DESKTOP_SRC" ] && [[ "$SCRIPT" == *jetbrains* ]]; then
            DESKTOP_SRC=$(find ~/.local/share/applications -name "jetbrains-toolbox.desktop" 2>/dev/null | head -1)
        fi
    fi

    if [ -n "$DESKTOP_SRC" ]; then
        DEST="$SHORTCUTS_DIR/$(basename "$DESKTOP_SRC")"
        if [ -f "$DEST" ]; then
            continue
        fi
        cp "$DESKTOP_SRC" "$DEST"
        chmod +x "$DEST"
        # mark as trusted so GNOME doesn't prompt "allow launching"
        gio set "$DEST" metadata::trusted true 2>/dev/null
        SHORTCUT_COUNT=$((SHORTCUT_COUNT + 1))
    fi
done

log "  Created $SHORTCUT_COUNT desktop shortcuts"

sudo -k
kill "$keepalive_pid" 2>/dev/null
