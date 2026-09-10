#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Element.Element -e --accept-source-agreements --disable-interactivity --purge --silent
