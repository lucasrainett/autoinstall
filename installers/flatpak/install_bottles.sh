#!/usr/bin/env bash
# Bottles - Run Windows software and games on Linux.
# Easy Wine prefix management with gaming and application presets.
# https://usebottles.com

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.usebottles.bottles &>/dev/null && echo "Bottles already installed, skipping." && exit 0
flatpak install com.usebottles.bottles -y --noninteractive
