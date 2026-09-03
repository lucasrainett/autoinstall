#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Brave.Brave -e --accept-source-agreements --silent
