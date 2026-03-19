#!/usr/bin/env bash

flatpak info org.onlyoffice.desktopeditors &>/dev/null && echo "Onlyoffice already installed, skipping." && exit 0
flatpak install org.onlyoffice.desktopeditors -y --noninteractive
