#!/usr/bin/env bash

flatpak info com.mojang.Minecraft &>/dev/null && echo "Minecraft already installed, skipping." && exit 0
flatpak install com.mojang.Minecraft -y --noninteractive
