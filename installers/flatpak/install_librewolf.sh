#!/usr/bin/env bash
# LibreWolf - Privacy-focused Firefox fork.
# Firefox with enhanced privacy defaults, no telemetry, and uBlock Origin.
# https://librewolf.net

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info io.gitlab.librewolf-community &>/dev/null && echo "LibreWolf already installed, skipping." && exit 0
flatpak install io.gitlab.librewolf-community -y --noninteractive
