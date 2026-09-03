#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Amazon.AWSCLI -e --accept-source-agreements --silent
