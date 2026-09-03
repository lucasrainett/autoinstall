#!/usr/bin/env bash
# Exit 0 = diagnostic submission disabled, 1 = enabled (or unknown).
# Reads the same preference the Security & Privacy pane writes. Readable without elevation, which
# the unelevated startup scan requires.
PLIST=/Library/Application\ Support/CrashReporter/DiagnosticMessagesHistory.plist
[ -f "$PLIST" ] || exit 1
[ "$(defaults read "$PLIST" AutoSubmit 2>/dev/null)" = "0" ]
