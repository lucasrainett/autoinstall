#!/usr/bin/env bash
set -euo pipefail

winget install --id Mozilla.Thunderbird -e \\
  --accept-source-agreements --accept-package-agreements --silent
