#!/usr/bin/env bash
# StreamController - Elgato Stream Deck controller for Linux.
# Manage and customize Stream Deck buttons with plugins.
# https://github.com/StreamController/StreamController

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.core447.StreamController &>/dev/null && echo "Stream Controller already installed, skipping." && exit 0
flatpak install com.core447.StreamController -y --noninteractive
