#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id cjpais.Handy -e --accept-source-agreements --disable-interactivity --purge --silent
