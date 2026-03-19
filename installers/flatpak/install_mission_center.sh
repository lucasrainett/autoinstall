#!/usr/bin/env bash
# Mission Center - System monitor for Linux.
# Real-time CPU, memory, disk, network, and GPU usage.
# https://missioncenter.io

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info io.missioncenter.MissionCenter &>/dev/null && echo "Mission Center already installed, skipping." && exit 0
flatpak install io.missioncenter.MissionCenter -y --noninteractive
