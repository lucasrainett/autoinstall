#!/usr/bin/env bash

flatpak info app.grayjay.Grayjay &>/dev/null && echo "Grayjay already installed, skipping." && exit 0
flatpak install app.grayjay.Grayjay -y --noninteractive
