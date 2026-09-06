#!/usr/bin/env bash
set -euo pipefail

winget install --id Proton.ProtonMail -e \
  --accept-source-agreements --accept-package-agreements --silent
