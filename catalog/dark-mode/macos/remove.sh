#!/usr/bin/env bash
set -euo pipefail

osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to false'
echo "Light mode restored."
