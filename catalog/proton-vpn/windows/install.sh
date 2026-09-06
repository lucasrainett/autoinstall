#!/usr/bin/env bash
set -euo pipefail

winget install --id Proton.ProtonVPN -e \
  --accept-source-agreements --accept-package-agreements --silent
