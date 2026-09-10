#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id RedHat.Podman-Desktop -e --accept-source-agreements --disable-interactivity --purge --silent
