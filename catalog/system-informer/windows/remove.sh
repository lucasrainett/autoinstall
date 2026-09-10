#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id WinsiderSS.SystemInformer -e --accept-source-agreements --disable-interactivity --purge --silent
