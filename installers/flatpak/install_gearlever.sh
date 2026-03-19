#!/usr/bin/env bash

flatpak info it.mijorus.gearlever &>/dev/null && echo "Gearlever already installed, skipping." && exit 0
flatpak install it.mijorus.gearlever -y --noninteractive
