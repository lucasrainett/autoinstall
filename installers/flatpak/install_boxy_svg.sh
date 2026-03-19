#!/usr/bin/env bash

flatpak info com.boxy_svg.BoxySVG &>/dev/null && echo "Boxy Svg already installed, skipping." && exit 0
flatpak install com.boxy_svg.BoxySVG -y --noninteractive
