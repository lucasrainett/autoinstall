#!/usr/bin/env bash

flatpak info com.jeffser.Alpaca &>/dev/null && echo "Alpaca already installed, skipping." && exit 0
flatpak install com.jeffser.Alpaca -y --noninteractive
