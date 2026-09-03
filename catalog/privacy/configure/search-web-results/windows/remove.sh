#!/usr/bin/env bash
set -euo pipefail

# Deletes the policy values rather than writing the opposite number. Unchecking a privacy entry
# should hand the decision back to Windows' own default, not force the feature on — the same rule
# the automatic-updates entry follows.
powershell.exe -NoProfile -Command "
  foreach (\$e in @(@{k='HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer'; n='DisableSearchBoxSuggestions'; v=1}, @{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Search'; n='AllowCortana'; v=0}, @{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Search'; n='ConnectedSearchUseWeb'; v=0})) {
    if (Test-Path \$e.k) {
      Remove-ItemProperty -Path \$e.k -Name \$e.n -ErrorAction SilentlyContinue
    }
  }"

echo "Remove web results from Start search: reverted to the Windows default."
