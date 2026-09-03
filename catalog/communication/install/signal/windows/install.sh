#!/usr/bin/env bash
set -euo pipefail

winget install --id OpenWhisperSystems.Signal -e \
  --accept-source-agreements --accept-package-agreements --silent
