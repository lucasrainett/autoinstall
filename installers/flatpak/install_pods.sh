#!/usr/bin/env bash
flatpak info com.github.marhkb.Pods &>/dev/null && echo "Pods already installed, skipping." && exit 0
flatpak install com.github.marhkb.Pods -y --noninteractive
