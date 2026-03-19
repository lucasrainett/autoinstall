#!/usr/bin/env bash

flatpak info com.valvesoftware.Steam &>/dev/null && echo "Steam already installed, skipping." && exit 0
flatpak install com.valvesoftware.Steam -y --noninteractive
