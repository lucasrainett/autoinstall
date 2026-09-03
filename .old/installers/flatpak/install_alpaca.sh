#!/usr/bin/env bash
# Alpaca - Local AI chat client for GNOME.
# Run large language models locally with an intuitive GTK interface.
# https://github.com/Jeffser/Alpaca

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.jeffser.Alpaca &>/dev/null && echo "Alpaca already installed, skipping." && exit 0
flatpak install com.jeffser.Alpaca -y --noninteractive
