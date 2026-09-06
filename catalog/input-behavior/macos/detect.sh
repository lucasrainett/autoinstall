#!/usr/bin/env bash
# Exit 0 = configured as this entry wants, 1 = not.
[ "$(defaults read -g InitialKeyRepeat 2>/dev/null)" = "20" ] || exit 1
[ "$(defaults read -g KeyRepeat 2>/dev/null)" = "2" ] || exit 1
[ "$(defaults read com.apple.driver.AppleBluetoothMultitouch.trackpad Clicking 2>/dev/null)" = "1" ] || exit 1
exit 0
