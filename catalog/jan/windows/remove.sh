#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Jan.Jan -e --accept-source-agreements --disable-interactivity --purge --silent
