#!/usr/bin/env bash
# Grayjay - Multi-platform video aggregator.
# Watch content from YouTube, Twitch, and other platforms in one app.
# https://grayjay.app

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info app.grayjay.Grayjay &>/dev/null && echo "Grayjay already installed, skipping." && exit 0
flatpak install app.grayjay.Grayjay -y --noninteractive
