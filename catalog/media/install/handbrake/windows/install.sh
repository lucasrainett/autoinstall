#!/usr/bin/env bash
set -euo pipefail

winget install --id HandBrake.HandBrake -e \
  --accept-source-agreements --accept-package-agreements --silent
