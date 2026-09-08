#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Zen-Team.Zen-Browser -e --accept-source-agreements --purge --silent
