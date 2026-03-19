#!/usr/bin/env bash
# Blanket - Ambient sound player.
# Play nature and background sounds to improve focus or relax.
# https://github.com/rafaelmardojai/blanket

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.rafaelmardojai.Blanket &>/dev/null && echo "Blanket already installed, skipping." && exit 0
flatpak install com.rafaelmardojai.Blanket -y --noninteractive
