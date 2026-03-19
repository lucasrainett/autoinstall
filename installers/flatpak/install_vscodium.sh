#!/usr/bin/env bash

flatpak info com.vscodium.codium &>/dev/null && echo "Vscodium already installed, skipping." && exit 0
flatpak install com.vscodium.codium -y --noninteractive
