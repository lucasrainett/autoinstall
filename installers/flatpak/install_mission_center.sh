#!/usr/bin/env bash

flatpak info io.missioncenter.MissionCenter &>/dev/null && echo "Mission Center already installed, skipping." && exit 0
flatpak install io.missioncenter.MissionCenter -y --noninteractive
