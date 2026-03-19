#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLERS_DIR="$SCRIPT_DIR/installers"
LOG_FILE="$HOME/.autoinstall.log"

# ── flags ──────────────────────────────────────────────────────
export AUTOINSTALL_UPDATE=false
DRY_RUN=false
SELECTED_APPS=()

for arg in "$@"; do
    case "$arg" in
        --update)  AUTOINSTALL_UPDATE=true ;;
        --dry-run) DRY_RUN=true ;;
        --help)
            echo "Usage: ./script.sh [options] [app names...]"
            echo ""
            echo "Options:"
            echo "  --update    Re-install apps even if already present"
            echo "  --dry-run   Show what would be installed without doing anything"
            echo "  --help      Show this help"
            echo ""
            echo "Examples:"
            echo "  ./script.sh                   Install everything"
            echo "  ./script.sh docker volta      Install only Docker and Volta"
            echo "  ./script.sh --update beeper   Force re-install Beeper"
            echo "  ./script.sh --dry-run         Preview all steps"
            exit 0
            ;;
        *)  SELECTED_APPS+=("${arg,,}") ;;
    esac
done

# ── steps ──────────────────────────────────────────────────────
STEPS=(
    # ── system config & security ──
    "Disable Telemetry|config/install_disable_telemetry.sh"
    "Power Profile|config/install_power_profile.sh"
    "System Tweaks|config/install_system_tweaks.sh"
    "Theme|config/install_theme.sh"
    "SSH Key|config/install_ssh.sh"
    "Git Config|config/install_git_config.sh"
    "Dotfiles|config/install_dotfiles.sh"
    "GNOME Settings|config/install_gnome_settings.sh"
    "GNOME Extensions|config/install_gnome_extensions.sh"
    "Taskbar|config/install_taskbar.sh"

    # ── system packages & services ──
    "Common Tools|apt/install_common_tools.sh"
    "Firewall|apt/install_firewall.sh"
    "Docker|apt/install_docker.sh"
    "Tailscale|apt/install_tailscale.sh"
    "Python|apt/install_python.sh"
    "Terraform|apt/install_terraform.sh"
    "GitHub CLI|apt/install_github_cli.sh"

    # ── removals ──
    "Remove Brave|remove/install_remove_brave.sh"
    "Remove LibreOffice|remove/install_remove_libreoffice.sh"

    # ── dev tools ──
    "Volta|other/install_volta.sh"
    "Claude Code|other/install_claude.sh"
    "OpenClaw|other/install_openclaw.sh"
    "AWS CLI|other/install_aws_cli.sh"
    "Go|other/install_go.sh"
    "Rust|other/install_rust.sh"
    "JetBrains Toolbox|other/install_jetbrains_toolbox.sh"

    # ── flatpak apps (GearLever first, needed by AppImages) ──
    "GearLever|flatpak/install_gearlever.sh"
    "Flatseal|flatpak/install_flatseal.sh"
    "Warehouse|flatpak/install_warehouse.sh"
    "Extension Manager|flatpak/install_extension_manager.sh"
    "VLC|flatpak/install_vlc.sh"
    "Signal|flatpak/install_signal.sh"
    "OnlyOffice|flatpak/install_onlyoffice.sh"
    "VSCodium|flatpak/install_vscodium.sh"
    "Bruno|flatpak/install_bruno.sh"
    "LibreWolf|flatpak/install_librewolf.sh"
    "Zen Browser|flatpak/install_zen_browser.sh"
    "Ungoogled Chromium|flatpak/install_ungoogled_chromium.sh"
    "Boxes|flatpak/install_boxes.sh"
    "DistroShelf|flatpak/install_distroshelf.sh"
    "Pods|flatpak/install_pods.sh"
    "Mission Center|flatpak/install_mission_center.sh"
    "Angry IP Scanner|flatpak/install_angry_ip_scanner.sh"
    "Solaar|flatpak/install_solaar.sh"
    "Moonlight|flatpak/install_moonlight.sh"
    "Stream Controller|flatpak/install_stream_controller.sh"
    "OBS Studio|flatpak/install_obs.sh"
    "HandBrake|flatpak/install_handbrake.sh"
    "Parabolic|flatpak/install_parabolic.sh"
    "Boxy SVG|flatpak/install_boxy_svg.sh"
    "Minder|flatpak/install_minder.sh"
    "Blanket|flatpak/install_blanket.sh"
    "Alpaca|flatpak/install_alpaca.sh"
    "Bazaar|flatpak/install_bazaar.sh"
    "Grayjay|flatpak/install_grayjay.sh"
    "Exodus|flatpak/install_exodus.sh"
    "OrcaSlicer|flatpak/install_orca_slicer.sh"
    "Proton VPN|deb/install_proton_vpn.sh"
    "Lutris|flatpak/install_lutris.sh"
    "Heroic Games Launcher|flatpak/install_heroic.sh"
    "Bottles|flatpak/install_bottles.sh"

    # ── gaming ──
    "Steam|deb/install_steam.sh"
    "Minecraft|flatpak/install_minecraft.sh"
    "Sunshine|deb/install_sunshine.sh"

    # ── deb & appimage apps ──
    "Proton Pass|deb/install_proton_pass.sh"
    "Proton Mail|deb/install_proton_mail.sh"
    "Beeper|appimage/install_beeper.sh"
    "LM Studio|appimage/install_lmstudio.sh"
    "Cryptomator|appimage/install_cryptomator.sh"
    "Helium|appimage/install_helium.sh"
    "WinBoat|appimage/install_winboat.sh"

    # ── cleanup (always last) ──
    "Cleanup Downloads|config/install_cleanup_downloads.sh"
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

# ── batch flatpak pre-install ──────────────────────────────────
batch_flatpak_install() {
    if $DRY_RUN; then
        return
    fi

    log ""
    log "Pre-installing flatpak apps in batch..."

    # map of flatpak script -> flatpak ID
    FLATPAK_IDS=()
    for entry in "${STEPS[@]}"; do
        NAME="${entry%%|*}"
        SCRIPT="${entry##*|}"

        # only simple flatpak scripts (single flatpak install line)
        [[ "$SCRIPT" != flatpak/install_*.sh ]] && continue
        # skip complex scripts
        [[ "$SCRIPT" == *zen_browser* || "$SCRIPT" == *orca_slicer* || "$SCRIPT" == *distroshelf* ]] && continue
        # check selective filter
        should_run "$NAME" || continue

        FILEPATH="$INSTALLERS_DIR/$SCRIPT"
        FLATPAK_ID=$(grep -oP 'flatpak install \K\S+' "$FILEPATH" 2>/dev/null)
        [ -z "$FLATPAK_ID" ] && continue

        if $AUTOINSTALL_UPDATE || ! flatpak info "$FLATPAK_ID" &>/dev/null; then
            FLATPAK_IDS+=("$FLATPAK_ID")
        fi
    done

    if [ ${#FLATPAK_IDS[@]} -eq 0 ]; then
        log "  All flatpak apps already installed."
        return
    fi

    log "  Installing ${#FLATPAK_IDS[@]} flatpak apps..."
    flatpak install "${FLATPAK_IDS[@]}" -y --noninteractive 2>&1 | tee -a "$LOG_FILE"
}

# ── main ───────────────────────────────────────────────────────
if $DRY_RUN; then
    log "DRY RUN - no changes will be made"
    log ""
    for i in "${!STEPS[@]}"; do
        NAME="${STEPS[$i]%%|*}"
        SCRIPT="${STEPS[$i]##*|}"
        PROGRESS=$(( (i * 100) / TOTAL ))
        if should_run "$NAME"; then
            log "  [$PROGRESS%] ($((i + 1))/$TOTAL) Would install: $NAME ($SCRIPT)"
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

# batch all simple flatpak installs for speed
batch_flatpak_install

for i in "${!STEPS[@]}"; do
    NAME="${STEPS[$i]%%|*}"
    SCRIPT="${STEPS[$i]##*|}"
    PROGRESS=$(( (i * 100) / TOTAL ))

    if ! should_run "$NAME"; then
        SKIPPED+=("$NAME (not selected)")
        continue
    fi

    log ""
    log "[$PROGRESS%] Installing $NAME... ($((i + 1))/$TOTAL)"

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

# ── create desktop shortcuts folder ───────────────────────────
SHORTCUTS_DIR="$HOME/Desktop/Installed Apps"
mkdir -p "$SHORTCUTS_DIR"
log ""
log "Creating desktop shortcuts in '$SHORTCUTS_DIR'..."

SHORTCUT_COUNT=0
for entry in "${STEPS[@]}"; do
    NAME="${entry%%|*}"
    SCRIPT="${entry##*|}"

    # skip non-launchable steps
    [[ "$SCRIPT" == config/* ]] && continue
    [[ "$SCRIPT" == remove/* ]] && continue
    [[ "$SCRIPT" == apt/* ]] && continue
    [[ "$SCRIPT" == other/install_volta.sh ]] && continue
    [[ "$SCRIPT" == other/install_claude.sh ]] && continue
    [[ "$SCRIPT" == other/install_openclaw.sh ]] && continue
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

log "  Created $SHORTCUT_COUNT shortcuts in '$SHORTCUTS_DIR'"

sudo -k
kill "$keepalive_pid" 2>/dev/null
