#!/usr/bin/env bash

flatpak info org.gnome.Boxes &>/dev/null && echo "Boxes already installed, skipping." && exit 0
flatpak install org.gnome.Boxes -y --noninteractive
