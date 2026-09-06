#!/usr/bin/env bash
set -euo pipefail

winget install --id Rustlang.Rustup -e \
  --accept-source-agreements --accept-package-agreements --silent
