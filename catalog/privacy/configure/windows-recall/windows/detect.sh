#!/usr/bin/env bash
# Exit 0 = the policy is in place, 1 = not.
#
# Every value is checked, not just the first: Windows spreads a single user-facing setting across
# several policy names, and having set one of them is not the same as having set the behaviour.
powershell.exe -NoProfile -Command "
  foreach (\$e in @(@{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI'; n='DisableAIDataAnalysis'; v=1}, @{k='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI'; n='AllowRecallEnablement'; v=0}, @{k='HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsAI'; n='DisableAIDataAnalysis'; v=1})) {
    \$cur = (Get-ItemProperty -Path \$e.k -Name \$e.n -ErrorAction SilentlyContinue).(\$e.n)
    if (\$cur -ne \$e.v) { exit 1 }
  }
  exit 0" 2>/dev/null
