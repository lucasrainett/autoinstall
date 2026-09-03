#!/usr/bin/env bash
set -euo pipefail

winget install --id angryziber.AngryIPScanner -e \
  --accept-source-agreements --accept-package-agreements --silent
