#!/usr/bin/env bash
# Exit 0 = auto-hide is on, 1 = not.
[ "$(defaults read com.apple.dock autohide 2>/dev/null)" = "1" ] || exit 1
exit 0
