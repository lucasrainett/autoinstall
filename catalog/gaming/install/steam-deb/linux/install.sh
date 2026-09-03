#!/usr/bin/env bash
set -euo pipefail

# `steam-installer` is Ubuntu's multiverse package; it pulls in Valve's bootstrap and the 32-bit
# runtime libraries. Installed rather than fetching a .deb from Valve directly so the distribution
# keeps it updated through apt like anything else.
#
# i386 must be enabled first: Steam's runtime is 32-bit, and without the architecture apt resolves
# the dependencies to nothing and the install fails with an unhelpful message about unmet
# dependencies rather than the actual cause.
if ! dpkg --print-foreign-architectures | grep -qx i386; then
  sudo dpkg --add-architecture i386
  sudo apt update -y
fi

sudo apt install -y steam-installer
