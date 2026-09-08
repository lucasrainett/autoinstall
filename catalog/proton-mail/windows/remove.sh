#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Proton.ProtonMail -e --accept-source-agreements --purge --silent
