#!/usr/bin/env bash
# Exodus - Multi-cryptocurrency wallet.
# Desktop wallet supporting 200+ crypto assets with built-in exchange.
# https://www.exodus.com

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info io.exodus.Exodus &>/dev/null && echo "Exodus already installed, skipping." && exit 0
flatpak install io.exodus.Exodus -y --noninteractive
