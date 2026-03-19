#!/usr/bin/env bash
# OBS Studio - Open-source streaming and recording software.
# Professional video recording and live streaming.
# https://obsproject.com

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.obsproject.Studio &>/dev/null && echo "Obs already installed, skipping." && exit 0
flatpak install com.obsproject.Studio -y --noninteractive
