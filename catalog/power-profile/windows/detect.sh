#!/usr/bin/env bash
# Exit 0 = the High performance scheme is active, 1 = not (or unavailable on this machine).
#
# SCHEME_MIN is Windows' built-in "High performance" GUID. Modern laptops sometimes hide it behind
# a manufacturer power slider, in which case it is simply absent and this reports not-configured.
powershell.exe -NoProfile -Command "
  \$active = (powercfg /getactivescheme) -join ' '
  if (\$active -match '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c') { exit 0 } else { exit 1 }" 2>/dev/null
