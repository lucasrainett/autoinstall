#!/usr/bin/env bash
set -euo pipefail

# Installing is only half of it: Howdy authenticates nothing until a face is enrolled, and it
# cannot be enrolled unattended. Said here so the entry does not look broken afterwards.
sudo add-apt-repository -y ppa:boltgolt/howdy
sudo apt update -y
sudo apt install -y howdy

echo "Howdy installed. Run 'sudo howdy add' to enrol your face — until then it authenticates nothing."
echo "It needs an infrared camera; an ordinary webcam will not work."
