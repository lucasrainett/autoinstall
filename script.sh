#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLERS_DIR="$SCRIPT_DIR/installers"

STEPS=(
    "Common Tools|apt/install_common_tools.sh"
    "Theme|config/install_theme.sh"
    "SSH Key|config/install_ssh.sh"
    "Docker|apt/install_docker.sh"
    "GearLever|flatpak/install_gearlever.sh"
    "Beeper|appimage/install_beeper.sh"
    "LM Studio|appimage/install_lmstudio.sh"
    "Cryptomator|appimage/install_cryptomator.sh"
    "Helium|appimage/install_helium.sh"
    "WinBoat|appimage/install_winboat.sh"
    "Proton Pass|deb/install_proton_pass.sh"
    "Proton Mail|deb/install_proton_mail.sh"
    "JetBrains Toolbox|other/install_jetbrains_toolbox.sh"
    "Volta|other/install_volta.sh"
    "VLC|flatpak/install_vlc.sh"
    "Signal|flatpak/install_signal.sh"
    "OnlyOffice|flatpak/install_onlyoffice.sh"
    "Boxes|flatpak/install_boxes.sh"
    "Angry IP Scanner|flatpak/install_angry_ip_scanner.sh"
    "Mission Center|flatpak/install_mission_center.sh"
    "Ungoogled Chromium|flatpak/install_ungoogled_chromium.sh"
    "Bazaar|flatpak/install_bazaar.sh"
    "Exodus|flatpak/install_exodus.sh"
    "VSCodium|flatpak/install_vscodium.sh"
    "Moonlight|flatpak/install_moonlight.sh"
    "Stream Controller|flatpak/install_stream_controller.sh"
    "Grayjay|flatpak/install_grayjay.sh"
    "Boxy SVG|flatpak/install_boxy_svg.sh"
    "Alpaca|flatpak/install_alpaca.sh"
    "Minecraft|flatpak/install_minecraft.sh"
    "Steam|flatpak/install_steam.sh"
    "OBS Studio|flatpak/install_obs.sh"
    "Proton VPN|flatpak/install_proton_vpn.sh"
    "OrcaSlicer|flatpak/install_orca_slicer.sh"
    "DistroShelf|flatpak/install_distroshelf.sh"
    "Pods|flatpak/install_pods.sh"
    "Minder|flatpak/install_minder.sh"
    "Blanket|flatpak/install_blanket.sh"
    "Bruno|flatpak/install_bruno.sh"
    "HandBrake|flatpak/install_handbrake.sh"
    "LibreWolf|flatpak/install_librewolf.sh"
    "Parabolic|flatpak/install_parabolic.sh"
    "Flatseal|flatpak/install_flatseal.sh"
    "Warehouse|flatpak/install_warehouse.sh"
    "Solaar|flatpak/install_solaar.sh"
    "Extension Manager|flatpak/install_extension_manager.sh"
    "Remove Brave|remove/install_remove_brave.sh"
    "Remove LibreOffice|remove/install_remove_libreoffice.sh"
    "Taskbar|config/install_taskbar.sh"
    "Zen Browser|flatpak/install_zen_browser.sh"
)

TOTAL=${#STEPS[@]}

echo "Requesting sudo privileges..."
sudo -v
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &
keepalive_pid=$!

for i in "${!STEPS[@]}"; do
    NAME="${STEPS[$i]%%|*}"
    SCRIPT="${STEPS[$i]##*|}"
    PROGRESS=$(( (i * 100) / TOTAL ))
    echo ""
    echo "[$PROGRESS%] Installing $NAME... ($((i + 1))/$TOTAL)"
    "$INSTALLERS_DIR/$SCRIPT" || echo "  FAILED: $NAME (continuing...)"
done

echo ""
echo "[100%] All done!"

sudo -k
kill "$keepalive_pid" 2>/dev/null
