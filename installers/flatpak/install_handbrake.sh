#!/usr/bin/env bash
flatpak info fr.handbrake.ghb &>/dev/null && echo "HandBrake already installed, skipping." && exit 0
flatpak install fr.handbrake.ghb -y --noninteractive
