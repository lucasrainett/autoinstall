#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Elgato.StreamDeck -e --accept-source-agreements --silent
