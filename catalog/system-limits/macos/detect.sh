#!/usr/bin/env bash
# Exit 0 = the open-file limit is raised, 1 = not.
#
# macOS has no inotify, so only the descriptor half of this entry applies. `launchctl limit` is the
# system-wide value; the shell's own ulimit inherits from it.
current=$(launchctl limit maxfiles 2>/dev/null | awk '{print $2}')
[ -n "$current" ] || exit 1
[ "$current" = "unlimited" ] && exit 0
[ "$current" -ge 65536 ] 2>/dev/null
