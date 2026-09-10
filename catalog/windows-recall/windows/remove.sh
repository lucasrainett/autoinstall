#!/usr/bin/env bash
set -euo pipefail

# Same guard as install.sh: reverting these settings writes to HKLM or scheduled tasks, and an
# unelevated shell fails partway, leaving the machine half-reverted. Declining (exit 3) leaves it
# consistently as it was.
if ! powershell.exe -NoProfile -Command \
  "\$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator); \
   if (\$admin) { exit 0 } else { exit 1 }" 2>/dev/null
then
  echo "Reverting this needs an elevated shell. Run the tool as administrator." >&2
  echo "Nothing was changed." >&2
  exit 3
fi

# Deletes the policy values rather than writing the opposite number. Unchecking a privacy entry
# should hand the decision back to Windows' own default, not force the feature on — the same rule
# the automatic-updates entry follows.
powershell.exe -NoProfile -Command "
  foreach (\$e in @(@{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI'; n='DisableAIDataAnalysis'; v=1}, @{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI'; n='AllowRecallEnablement'; v=0}, @{k='HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsAI'; n='DisableAIDataAnalysis'; v=1})) {
    if (Test-Path \$e.k) {
      Remove-ItemProperty -Path \$e.k -Name \$e.n -ErrorAction SilentlyContinue
    }
  }"

echo "Disable Windows Recall: reverted to the Windows default."
