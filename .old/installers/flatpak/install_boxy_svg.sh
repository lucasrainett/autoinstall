#!/usr/bin/env bash
# Boxy SVG - SVG vector graphics editor.
# Browser-grade SVG editor with a clean interface.
# https://boxy-svg.com

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.boxy_svg.BoxySVG &>/dev/null && echo "Boxy Svg already installed, skipping." && exit 0
flatpak install com.boxy_svg.BoxySVG -y --noninteractive
