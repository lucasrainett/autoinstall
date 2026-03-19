#!/usr/bin/env bash
# Ungoogled Chromium - Chromium browser without Google integration.
# Privacy-focused browser with Google services removed.
# https://ungoogled-software.github.io

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info io.github.ungoogled_software.ungoogled_chromium &>/dev/null && echo "Ungoogled Chromium already installed, skipping." && exit 0
flatpak install io.github.ungoogled_software.ungoogled_chromium -y --noninteractive
