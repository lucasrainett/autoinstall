#!/usr/bin/env bash
set -euo pipefail

winget install --id Beeper.Beeper -e \
  --accept-source-agreements --accept-package-agreements --silent
