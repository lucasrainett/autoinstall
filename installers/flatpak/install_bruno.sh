#!/usr/bin/env bash
flatpak info com.usebruno.Bruno &>/dev/null && echo "Bruno already installed, skipping." && exit 0
flatpak install com.usebruno.Bruno -y --noninteractive
