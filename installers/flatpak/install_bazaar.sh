#!/usr/bin/env bash

flatpak info io.github.kolunmi.Bazaar &>/dev/null && echo "Bazaar already installed, skipping." && exit 0
flatpak install io.github.kolunmi.Bazaar -y --noninteractive
