#!/usr/bin/env bash
flatpak info io.github.flattool.Warehouse &>/dev/null && echo "Warehouse already installed, skipping." && exit 0
flatpak install io.github.flattool.Warehouse -y --noninteractive
