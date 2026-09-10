#!/usr/bin/env bash
# Exit 0 = telemetry set to the minimum, 1 = not set.
# Runs under Git Bash, so the registry read goes through powershell.exe.
# `\$v`, not `$v`: this is a bash double-quoted string, so bash expands `$v` to nothing before
# PowerShell sees it. The command then began with " = (Get-ItemProperty ...", a parse error, and
# PowerShell exited non-zero — which this script reports as exit 1, "not installed". The setting
# was applied correctly every time and detect could never see it.
powershell.exe -NoProfile -Command \
  "\$v = (Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name AllowTelemetry -ErrorAction SilentlyContinue).AllowTelemetry; if (\$v -eq 0) { exit 0 } else { exit 1 }" 2>/dev/null
