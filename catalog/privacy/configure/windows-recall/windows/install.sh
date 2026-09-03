#!/usr/bin/env bash
set -euo pipefail

powershell.exe -NoProfile -Command "
  foreach (\$e in @(@{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI'; n='DisableAIDataAnalysis'; v=1}, @{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI'; n='AllowRecallEnablement'; v=0}, @{k='HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsAI'; n='DisableAIDataAnalysis'; v=1})) {
    New-Item -Path \$e.k -Force | Out-Null
    Set-ItemProperty -Path \$e.k -Name \$e.n -Value \$e.v -Type DWord -Force
  }"

echo "Disable Windows Recall: applied."
