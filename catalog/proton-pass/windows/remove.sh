#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Proton.ProtonPass -e --accept-source-agreements --purge --silent
