#!/usr/bin/env bash
set -euo pipefail

# Declines rather than half-applies when not elevated. On Windows these settings live under HKLM or
# in scheduled tasks, and without administrator rights PowerShell fails partway through with
# "PermissionDenied ... HRESULT 0x80070005" — some changes made, some not. Seen on a CI runner,
# but the same thing happens in any non-elevated shell.
if ! powershell.exe -NoProfile -Command \
  "\$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator); \
   if (\$admin) { exit 0 } else { exit 1 }" 2>/dev/null
then
  echo "This entry changes machine-wide settings and needs an elevated shell." >&2
  echo "Run the tool as administrator. Nothing was changed." >&2
  exit 3
fi

# AllowTelemetry=0 ("Security") is honoured fully on Enterprise/Education; Home and Pro clamp it
# to the "Required" level. Setting it is still the correct, documented minimum for the edition —
# it is not silently ineffective, it is bounded by the edition.
powershell.exe -NoProfile -Command \
  "New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Force | Out-Null; \
   Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name AllowTelemetry -Type DWord -Value 0"

# The scheduled tasks that gather and upload the data. Best-effort, and deliberately not fatal:
# several of these tasks are owned by TrustedInstaller, so Disable-ScheduledTask answers
# "PermissionDenied ... HRESULT 0x80070005" even in an elevated shell. Piping the whole path at
# once meant the first such task aborted the pipeline and failed the entry, leaving the tasks that
# *can* be disabled still running. Each task is disabled on its own and refusals are reported and
# stepped over — the policy value above is the part that matters, and it is already set.
powershell.exe -NoProfile -Command \
  "\$refused = @(); \
   foreach (\$path in @('\\Microsoft\\Windows\\Application Experience\\', '\\Microsoft\\Windows\\Customer Experience Improvement Program\\')) { \
     foreach (\$task in @(Get-ScheduledTask -TaskPath \$path -ErrorAction SilentlyContinue)) { \
       try { Disable-ScheduledTask -InputObject \$task -ErrorAction Stop | Out-Null } \
       catch { \$refused += \$task.TaskName } \
     } \
   } \
   if (\$refused.Count -gt 0) { \
     Write-Host \"Windows refused to disable: \$(\$refused -join ', '). These are protected by the system; the telemetry policy above still applies.\" \
   }"
