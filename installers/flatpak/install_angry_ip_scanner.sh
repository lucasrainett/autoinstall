#!/usr/bin/env bash

flatpak info org.angryip.ipscan &>/dev/null && echo "Angry Ip Scanner already installed, skipping." && exit 0
flatpak install org.angryip.ipscan -y --noninteractive
