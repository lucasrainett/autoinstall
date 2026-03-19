#!/usr/bin/env bash

flatpak info io.exodus.Exodus &>/dev/null && echo "Exodus already installed, skipping." && exit 0
flatpak install io.exodus.Exodus -y --noninteractive
