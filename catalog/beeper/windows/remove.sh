#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Beeper.Beeper -e --accept-source-agreements --disable-interactivity --purge --silent
