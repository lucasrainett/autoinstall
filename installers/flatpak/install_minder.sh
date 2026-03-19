#!/usr/bin/env bash
flatpak info com.github.phase1geo.minder &>/dev/null && echo "Minder already installed, skipping." && exit 0
flatpak install com.github.phase1geo.minder -y --noninteractive
