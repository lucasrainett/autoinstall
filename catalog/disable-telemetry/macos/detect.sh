#!/usr/bin/env bash
# Exit 0 = diagnostic submission disabled, 1 = enabled (or unknown).
# Reads the same preference the Security & Privacy pane writes. Readable without elevation, which
# the unelevated startup scan requires.
# `defaults` takes a domain, not a file. Given a path that already ends in .plist it appends
# another one, so the install was writing DiagnosticMessagesHistory.plist.plist while detect's
# `[ -f ]` looked for DiagnosticMessagesHistory.plist. That passed only on an image where macOS had
# already created the real file, and started failing the moment the runner image no longer did.
DOMAIN="/Library/Application Support/CrashReporter/DiagnosticMessagesHistory"
PLIST="$DOMAIN.plist"
[ -f "$PLIST" ] || exit 1
[ "$(defaults read "$DOMAIN" AutoSubmit 2>/dev/null)" = "0" ]
