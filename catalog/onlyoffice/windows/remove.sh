#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id ONLYOFFICE.DesktopEditors -e --accept-source-agreements --purge --silent
