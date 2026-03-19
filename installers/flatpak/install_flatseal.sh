#!/usr/bin/env bash
flatpak info com.github.tchx84.Flatseal &>/dev/null && echo "Flatseal already installed, skipping." && exit 0
flatpak install com.github.tchx84.Flatseal -y --noninteractive
