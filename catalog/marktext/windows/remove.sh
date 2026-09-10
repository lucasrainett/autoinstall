#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id MarkText.MarkText -e --accept-source-agreements --disable-interactivity --purge --silent
