#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id LibreWolf.LibreWolf -e --accept-source-agreements --disable-interactivity --purge --silent
