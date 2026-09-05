#!/usr/bin/env bash
set -euo pipefail

# The distro package rather than Flathub: KDE Connect needs to open listening ports and talk to
# the desktop session, and the sandboxed Flatpak build makes both awkward. Zorin Connect, which
# Zorin ships preinstalled, is a fork of this same project.
sudo apt update -y
sudo apt install -y kdeconnect
