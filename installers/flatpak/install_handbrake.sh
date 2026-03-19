#!/usr/bin/env bash
# HandBrake - Open-source video transcoder.
# Convert video between formats with hardware-accelerated encoding.
# https://handbrake.fr

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info fr.handbrake.ghb &>/dev/null && echo "HandBrake already installed, skipping." && exit 0
flatpak install fr.handbrake.ghb -y --noninteractive
