#!/usr/bin/env bash
set -euo pipefail

powershell.exe -NoProfile -Command "
  foreach (\$e in @(@{k='HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer'; n='DisableSearchBoxSuggestions'; v=1}, @{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Search'; n='AllowCortana'; v=0}, @{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Search'; n='ConnectedSearchUseWeb'; v=0})) {
    New-Item -Path \$e.k -Force | Out-Null
    Set-ItemProperty -Path \$e.k -Name \$e.n -Value \$e.v -Type DWord -Force
  }"

echo "Remove web results from Start search: applied."
