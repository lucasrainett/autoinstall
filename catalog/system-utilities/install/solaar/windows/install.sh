#!/usr/bin/env bash
set -euo pipefail

winget install --id Logitech.OptionsPlus -e \\
  --accept-source-agreements --accept-package-agreements --silent
