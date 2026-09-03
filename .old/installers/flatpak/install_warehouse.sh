#!/usr/bin/env bash
# Warehouse - Flatpak management tool.
# Manage, update, and clean up flatpak apps and runtimes.
# https://github.com/flattool/warehouse

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info io.github.flattool.Warehouse &>/dev/null && echo "Warehouse already installed, skipping." && exit 0
flatpak install io.github.flattool.Warehouse -y --noninteractive
