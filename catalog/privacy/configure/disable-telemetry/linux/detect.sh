#!/usr/bin/env bash
# Exit 0 = telemetry disabled, 1 = not disabled.
#
# The /etc/hosts marker is the single source of truth for "this entry has been applied": it is
# world-readable (so the unelevated startup scan can check it), it is written and removed as one
# block by this entry, and unlike the GNOME settings it is present on headless machines too.
grep -q "^# autoinstall: telemetry block" /etc/hosts 2>/dev/null
