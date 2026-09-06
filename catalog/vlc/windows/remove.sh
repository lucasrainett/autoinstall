#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id VideoLAN.VLC -e --accept-source-agreements --silent
