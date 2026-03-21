#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLERS_DIR="$SCRIPT_DIR/installers_macos"
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
            echo "Usage: ./script_macos.sh [options] [app names...]"
            echo ""
            echo "Options:"
            echo "  --update    Re-install apps even if already present"
            echo "  --dry-run   Show what would be installed without doing anything"
            echo "  --help      Show this help"
            echo ""
            echo "Examples:"
            echo "  ./script_macos.sh                   Install everything"
            echo "  ./script_macos.sh docker volta       Install only Docker and Volta"
            echo "  ./script_macos.sh --update signal    Force re-install Signal"
            echo "  ./script_macos.sh --dry-run          Preview all steps"
            exit 0
            ;;
        *)  SELECTED_APPS+=("$(echo "$arg" | tr '[:upper:]' '[:lower:]')") ;;
    esac
done

# ── steps ──────────────────────────────────────────────────────
STEPS=(
    # ── system config & security ──
    "Disable Telemetry|config/install_disable_telemetry.sh"
    "System Tweaks|config/install_system_tweaks.sh"
    "Theme|config/install_theme.sh"
    "SSH Key|config/install_ssh.sh"
    "Git Config|config/install_git_config.sh"
    "Dotfiles|config/install_dotfiles.sh"
    "Dock|config/install_dock.sh"

    # ── brew formulae (CLI tools & services) ──
    "Common Tools|brew/install_common_tools.sh"
    "Docker|brew/install_docker.sh"
    "Tailscale|brew/install_tailscale.sh"
    "Python|brew/install_python.sh"
    "Terraform|brew/install_terraform.sh"
    "GitHub CLI|brew/install_github_cli.sh"

    # ── brew cask apps (GUI applications) ──
    "VLC|cask/install_vlc.sh"
    "Signal|cask/install_signal.sh"
    "LibreWolf|cask/install_librewolf.sh"
    "Zen Browser|cask/install_zen_browser.sh"
    "Ungoogled Chromium|cask/install_ungoogled_chromium.sh"
    "OBS Studio|cask/install_obs.sh"
    "HandBrake|cask/install_handbrake.sh"
    "Moonlight|cask/install_moonlight.sh"
    "Angry IP Scanner|cask/install_angry_ip_scanner.sh"
    "VSCodium|cask/install_vscodium.sh"
    "Proton VPN|cask/install_proton_vpn.sh"
    "Proton Pass|cask/install_proton_pass.sh"
    "Proton Mail|cask/install_proton_mail.sh"
    "LM Studio|cask/install_lmstudio.sh"
    "Cryptomator|cask/install_cryptomator.sh"
    "Mission Center|cask/install_mission_center.sh"
    "JetBrains Toolbox|cask/install_jetbrains_toolbox.sh"
    "Steam|cask/install_steam.sh"
    "Minecraft|cask/install_minecraft.sh"
    "Heroic Games Launcher|cask/install_heroic.sh"
    "OrcaSlicer|cask/install_orca_slicer.sh"
    "Beeper|cask/install_beeper.sh"

    # ── dev tools ──
    "Volta|other/install_volta.sh"
    "Claude Code|other/install_claude.sh"
    "AWS CLI|other/install_aws_cli.sh"
    "Go|other/install_go.sh"
    "Rust|other/install_rust.sh"

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
echo "autoinstall (macOS) started at $(date)" >> "$LOG_FILE"
echo "args: $*" >> "$LOG_FILE"
echo "════════════════════════════════════════════════════════════" >> "$LOG_FILE"

log() {
    echo "$1" | tee -a "$LOG_FILE"
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

# ── batch brew cask pre-install ────────────────────────────────
batch_cask_install() {
    if $DRY_RUN; then
        return
    fi

    log ""
    log "Pre-installing brew cask apps in batch..."

    CASK_NAMES=()
    for entry in "${STEPS[@]}"; do
        NAME="${entry%%|*}"
        SCRIPT="${entry##*|}"

        [[ "$SCRIPT" != cask/install_*.sh ]] && continue
        should_run "$NAME" || continue

        FILEPATH="$INSTALLERS_DIR/$SCRIPT"
        CASK_NAME=$(grep -o 'brew install --cask [^ ]*' "$FILEPATH" 2>/dev/null | awk '{print $NF}')
        [ -z "$CASK_NAME" ] && continue

        if $AUTOINSTALL_UPDATE || ! brew list --cask "$CASK_NAME" &>/dev/null; then
            CASK_NAMES+=("$CASK_NAME")
        fi
    done

    if [ ${#CASK_NAMES[@]} -eq 0 ]; then
        log "  All cask apps already installed."
        return
    fi

    log "  Installing ${#CASK_NAMES[@]} cask apps..."
    brew install --cask "${CASK_NAMES[@]}" 2>&1 | tee -a "$LOG_FILE"
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

# batch all simple cask installs for speed
batch_cask_install

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

sudo -k
kill "$keepalive_pid" 2>/dev/null
