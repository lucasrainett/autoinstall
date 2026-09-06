#!/usr/bin/env bash
set -euo pipefail

winget install --id RedHat.Podman -e \\
  --accept-source-agreements --accept-package-agreements --silent
