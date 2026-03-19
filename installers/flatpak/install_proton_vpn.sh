#!/usr/bin/env bash

flatpak info com.protonvpn.www &>/dev/null && echo "Proton Vpn already installed, skipping." && exit 0
flatpak install com.protonvpn.www -y --noninteractive
