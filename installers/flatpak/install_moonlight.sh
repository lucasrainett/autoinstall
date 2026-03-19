#!/usr/bin/env bash
# Moonlight - Open-source game streaming client.
# Stream games from a PC with NVIDIA/Sunshine to other devices.
# https://moonlight-stream.org

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.moonlight_stream.Moonlight &>/dev/null && echo "Moonlight already installed, skipping." && exit 0
flatpak install com.moonlight_stream.Moonlight -y --noninteractive
