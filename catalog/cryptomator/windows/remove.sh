#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Cryptomator.Cryptomator -e --accept-source-agreements --disable-interactivity --purge --silent
