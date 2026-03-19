#!/usr/bin/env bash
# Minecraft - Sandbox survival and building game.
# Official Minecraft launcher for Java and Bedrock editions.
# https://www.minecraft.net

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.mojang.Minecraft &>/dev/null && echo "Minecraft already installed, skipping." && exit 0
flatpak install com.mojang.Minecraft -y --noninteractive
