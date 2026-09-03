#!/usr/bin/env bash
set -euo pipefail

winget install --id Elgato.StreamDeck -e \
  --accept-source-agreements --accept-package-agreements --silent
