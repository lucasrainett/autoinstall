#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
winget list --id TheDocumentFoundation.LibreOffice -e --accept-source-agreements 2>/dev/null | grep -qi "TheDocumentFoundation.LibreOffice" || exit 1

# `winget upgrade --id` lists the package only when an upgrade is actually available.
if winget upgrade --id TheDocumentFoundation.LibreOffice -e --accept-source-agreements 2>/dev/null | grep -qi "TheDocumentFoundation.LibreOffice"; then
  exit 2
fi
exit 0
