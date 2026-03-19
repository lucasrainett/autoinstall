#!/usr/bin/env bash

flatpak info org.signal.Signal &>/dev/null && echo "Signal already installed, skipping." && exit 0
flatpak install org.signal.Signal -y --noninteractive
