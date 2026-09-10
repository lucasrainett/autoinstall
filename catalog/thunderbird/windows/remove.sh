#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Mozilla.Thunderbird -e --accept-source-agreements --disable-interactivity --purge --silent
