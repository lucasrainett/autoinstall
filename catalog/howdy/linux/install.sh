#!/usr/bin/env bash
set -euo pipefail

# Howdy authenticates with an infrared camera. Its postinst configures one, and on a machine with
# no capture device at all it fails — "Errors were encountered while processing howdy_2.6.1_all.deb"
# — leaving apt half-configured. There is nothing to gain from installing face authentication on a
# machine that cannot see: decline before touching apt.
if ! ls /dev/video* >/dev/null 2>&1; then
  echo "No video capture device found, so there is no camera for face authentication to use." >&2
  echo "Howdy needs an infrared camera. Nothing was changed." >&2
  exit 3
fi

# Installing is only half of it: Howdy authenticates nothing until a face is enrolled, and it
# cannot be enrolled unattended. Said here so the entry does not look broken afterwards.
sudo add-apt-repository -y ppa:boltgolt/howdy
sudo apt update -y
sudo apt install -y howdy

echo "Howdy installed. Run 'sudo howdy add' to enrol your face — until then it authenticates nothing."
echo "It needs an infrared camera; an ordinary webcam will not work."
