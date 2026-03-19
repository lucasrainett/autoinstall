#!/usr/bin/env bash
# WinBoat - Run Windows apps on Linux via containers.
# Uses Docker + QEMU/KVM to run Windows in a container, streamed via FreeRDP.
# https://www.winboat.app
# https://github.com/TibixDev/winboat
#
# Dependencies installed by this script:
# - freerdp3: RDP client used to stream the Windows desktop
# - qemu-system-x86: QEMU/KVM virtualization backend
# - kvm group: allows current user to access /dev/kvm
# - docker: must be running (enabled by systemctl)
# Fetches the latest AppImage version from the GitHub releases API.

# dependencies: FreeRDP 3.x (for RDP streaming) and KVM (for virtualization)

dpkg -s freerdp3-x11 &>/dev/null || sudo apt install -y freerdp3-x11 freerdp3-wayland
dpkg -s qemu-system-x86 &>/dev/null || sudo apt install -y qemu-system-x86

# ensure KVM is accessible by current user
groups "$USER" | grep -q kvm || sudo usermod -aG kvm "$USER"

# enable and start docker (required by winboat)
sudo systemctl enable --now docker

# download and integrate WinBoat
[ "$AUTOINSTALL_UPDATE" != "true" ] && ls ~/AppImages/*[Ww]inboat* &>/dev/null && echo "WinBoat already installed, skipping." && exit 0

cd ~/Downloads
VERSION=$(curl -s https://api.github.com/repos/TibixDev/winboat/releases/latest | grep -oP '"tag_name": "\K[^"]+')
VERSION_NUM=${VERSION#v}
wget -q --show-progress -O winboat.AppImage "https://github.com/TibixDev/winboat/releases/download/${VERSION}/winboat-${VERSION_NUM}-x86_64.AppImage"
flatpak run it.mijorus.gearlever --integrate winboat.AppImage -y
