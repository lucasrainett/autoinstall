#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Nickvision.Parabolic -e --accept-source-agreements --disable-interactivity --purge --silent
