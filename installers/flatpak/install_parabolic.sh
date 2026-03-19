#!/usr/bin/env bash
flatpak info org.nickvision.tubeconverter &>/dev/null && echo "Parabolic already installed, skipping." && exit 0
flatpak install org.nickvision.tubeconverter -y --noninteractive
