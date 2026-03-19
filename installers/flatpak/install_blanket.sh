#!/usr/bin/env bash
flatpak info com.rafaelmardojai.Blanket &>/dev/null && echo "Blanket already installed, skipping." && exit 0
flatpak install com.rafaelmardojai.Blanket -y --noninteractive
