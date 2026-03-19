#!/usr/bin/env bash
# Extension Manager - Browse and manage GNOME Shell extensions.
# Install, enable, disable, and update GNOME extensions.
# https://github.com/mjakeman/extension-manager

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.mattjakeman.ExtensionManager &>/dev/null && echo "Extension Manager already installed, skipping." && exit 0
flatpak install com.mattjakeman.ExtensionManager -y --noninteractive
