#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id aristocratos.btop4win -e --accept-source-agreements --disable-interactivity --purge --silent
