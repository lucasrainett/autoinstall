#!/usr/bin/env bash
set -euo pipefail

winget install --id HeroicGamesLauncher.HeroicGamesLauncher -e \
  --accept-source-agreements --accept-package-agreements --silent
