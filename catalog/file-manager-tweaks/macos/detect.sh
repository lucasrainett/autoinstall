#!/usr/bin/env bash
# Exit 0 = configured as this entry wants, 1 = not.
#
# Checks the settings that are unambiguous booleans. The Terminal profile is deliberately excluded
# from the check: it is only applied when a "Pro" profile exists, so requiring it would leave the
# entry permanently unsatisfiable on a Mac that has none.
[ "$(defaults read com.apple.finder AppleShowAllFiles 2>/dev/null)" = "1" ] || exit 1
[ "$(defaults read NSGlobalDomain AppleShowAllExtensions 2>/dev/null)" = "1" ] || exit 1
[ "$(defaults read com.apple.finder ShowPathbar 2>/dev/null)" = "1" ] || exit 1
[ "$(defaults read NSGlobalDomain NSNavPanelExpandedStateForSaveMode 2>/dev/null)" = "1" ] || exit 1
exit 0
