#!/usr/bin/env bash

# install podman (recommended container manager for distrobox)
dpkg -s podman &>/dev/null || sudo apt install -y podman

# install distrobox
dpkg -s distrobox &>/dev/null || sudo apt install -y distrobox

# install distroshelf GUI
flatpak info com.ranfdev.DistroShelf &>/dev/null && echo "DistroShelf already installed, skipping." && exit 0
flatpak install com.ranfdev.DistroShelf -y --noninteractive
