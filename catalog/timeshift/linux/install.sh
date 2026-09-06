#!/usr/bin/env bash
set -euo pipefail

sudo apt update -y
sudo apt install -y timeshift

echo "Timeshift installed. It takes no snapshots until you open it and choose where to store them."
