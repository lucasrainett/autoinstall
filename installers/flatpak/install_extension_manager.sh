#!/usr/bin/env bash
flatpak info com.mattjakeman.ExtensionManager &>/dev/null && echo "Extension Manager already installed, skipping." && exit 0
flatpak install com.mattjakeman.ExtensionManager -y --noninteractive
