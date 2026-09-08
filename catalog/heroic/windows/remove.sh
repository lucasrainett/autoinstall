#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id HeroicGamesLauncher.HeroicGamesLauncher -e --accept-source-agreements --purge --silent
