#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id RedHat.Podman -e --accept-source-agreements --silent
