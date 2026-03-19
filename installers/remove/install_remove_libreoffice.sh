#!/usr/bin/env bash
! dpkg -l | grep -q libreoffice && echo "LibreOffice not installed, skipping." && exit 0

sudo apt remove --purge libreoffice* -y
sudo apt autoremove -y
