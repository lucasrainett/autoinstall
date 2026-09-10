#!/usr/bin/env bash
set -euo pipefail

# The census package ships only on Zorin OS. Elsewhere `apt install` fails with "Unable to locate
# package zorin-os-census", which is not a failure: there is no Zorin telemetry on a machine that
# is not Zorin. Exit 3 is "declined, nothing changed".
if ! apt-cache show zorin-os-census >/dev/null 2>&1; then
  echo "zorin-os-census is not available here, so this machine is not a Zorin install and has" >&2
  echo "no Zorin census to disable. Nothing was changed." >&2
  exit 3
fi

sudo apt update -y
sudo apt install -y zorin-os-census
