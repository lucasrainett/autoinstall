#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id OpenWhisperSystems.Signal -e --accept-source-agreements --disable-interactivity --purge --silent
