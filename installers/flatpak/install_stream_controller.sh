#!/usr/bin/env bash

flatpak info com.core447.StreamController &>/dev/null && echo "Stream Controller already installed, skipping." && exit 0
flatpak install com.core447.StreamController -y --noninteractive
