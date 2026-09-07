#!/usr/bin/env bash
set -euo pipefail

REPO="${AUTOINSTALL_REPO:-lucasrainett/autoinstall}"
powershell.exe -NoProfile -Command "
  \$ErrorActionPreference = 'Stop'
  irm 'https://raw.githubusercontent.com/${REPO}/master/install.ps1' | iex
"
