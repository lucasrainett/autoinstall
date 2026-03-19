#!/usr/bin/env bash
# DistroShelf - GTK4 GUI for managing Distrobox containers.
# Create, remove, and manage Linux containers running different distros.
# https://github.com/ranfdev/DistroShelf
#
# Requires podman (rootless container runtime) and distrobox (container manager).
# Both are installed via apt before the flatpak GUI.

# install podman (recommended container manager for distrobox)

dpkg -s podman &>/dev/null || sudo apt install -y podman

# install distrobox
dpkg -s distrobox &>/dev/null || sudo apt install -y distrobox

# install distroshelf GUI
[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.ranfdev.DistroShelf &>/dev/null && echo "DistroShelf already installed, skipping." && exit 0
flatpak install com.ranfdev.DistroShelf -y --noninteractive
