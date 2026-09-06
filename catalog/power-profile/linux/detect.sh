#!/usr/bin/env bash
# Exit 0 = performance profile is active, 1 = not (or the daemon is absent).
command -v powerprofilesctl >/dev/null 2>&1 || exit 1
[ "$(powerprofilesctl get 2>/dev/null)" = "performance" ]
