#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id HandBrake.HandBrake -e --accept-source-agreements --purge --silent
