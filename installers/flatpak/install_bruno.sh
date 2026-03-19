#!/usr/bin/env bash
# Bruno - Open-source API client.
# Test and debug APIs with collections stored as plain files (no cloud).
# https://www.usebruno.com

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.usebruno.Bruno &>/dev/null && echo "Bruno already installed, skipping." && exit 0
flatpak install com.usebruno.Bruno -y --noninteractive
