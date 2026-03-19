#!/usr/bin/env bash

# dependencies: FreeRDP 3.x (for RDP streaming) and KVM (for virtualization)
dpkg -s freerdp3-x11 &>/dev/null || sudo apt install -y freerdp3-x11 freerdp3-wayland
dpkg -s qemu-system-x86 &>/dev/null || sudo apt install -y qemu-system-x86

# ensure KVM is accessible by current user
groups "$USER" | grep -q kvm || sudo usermod -aG kvm "$USER"

# enable and start docker (required by winboat)
sudo systemctl enable --now docker

# download and integrate WinBoat
[ -f ~/.local/share/applications/winboat*.desktop ] && echo "WinBoat already installed, skipping." && exit 0

cd ~/Downloads
VERSION=$(curl -s https://api.github.com/repos/TibixDev/winboat/releases/latest | grep -oP '"tag_name": "\K[^"]+')
VERSION_NUM=${VERSION#v}
wget -O winboat.AppImage "https://github.com/TibixDev/winboat/releases/download/${VERSION}/winboat-${VERSION_NUM}-x86_64.AppImage"
flatpak run it.mijorus.gearlever --integrate winboat.AppImage -y
