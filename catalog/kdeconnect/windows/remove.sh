#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id KDE.KDEConnect -e --accept-source-agreements --silent
