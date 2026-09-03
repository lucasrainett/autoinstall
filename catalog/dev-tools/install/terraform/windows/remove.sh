#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Hashicorp.Terraform -e --accept-source-agreements --silent
