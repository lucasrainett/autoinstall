#!/usr/bin/env bash

flatpak info io.github.ungoogled_software.ungoogled_chromium &>/dev/null && echo "Ungoogled Chromium already installed, skipping." && exit 0
flatpak install io.github.ungoogled_software.ungoogled_chromium -y --noninteractive
