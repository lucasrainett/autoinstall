#!/usr/bin/env bash

flatpak info com.moonlight_stream.Moonlight &>/dev/null && echo "Moonlight already installed, skipping." && exit 0
flatpak install com.moonlight_stream.Moonlight -y --noninteractive
