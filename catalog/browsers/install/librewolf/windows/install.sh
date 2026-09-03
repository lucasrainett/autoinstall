#!/usr/bin/env bash
set -euo pipefail

winget install --id LibreWolf.LibreWolf -e \
  --accept-source-agreements --accept-package-agreements --silent
