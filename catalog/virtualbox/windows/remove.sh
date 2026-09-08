#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Oracle.VirtualBox -e --accept-source-agreements --purge --silent
