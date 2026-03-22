#!/usr/bin/env bash
# Remove Cheese webcam app.

! dpkg -s cheese &>/dev/null && echo "Cheese not installed, skipping." && exit 0

sudo apt remove --purge cheese -y
sudo apt autoremove -y
