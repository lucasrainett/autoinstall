#!/usr/bin/env bash
flatpak info io.github.pwr_solaar.solaar &>/dev/null && echo "Solaar already installed, skipping." && exit 0
flatpak install io.github.pwr_solaar.solaar -y --noninteractive
