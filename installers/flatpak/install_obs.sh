#!/usr/bin/env bash

flatpak info com.obsproject.Studio &>/dev/null && echo "Obs already installed, skipping." && exit 0
flatpak install com.obsproject.Studio -y --noninteractive
