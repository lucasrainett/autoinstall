#!/usr/bin/env bash
flatpak info io.gitlab.librewolf-community &>/dev/null && echo "LibreWolf already installed, skipping." && exit 0
flatpak install io.gitlab.librewolf-community -y --noninteractive
