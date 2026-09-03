#!/usr/bin/env bash
set -euo pipefail

# Store apps cannot be installed unattended for a signed-in user, so this opens the Store rather
# than pretending to have installed anything.
#
# A search rather than a direct product link: the product page needs a package family name whose
# publisher segment differs per app (first-party Microsoft apps are 8wekyb3d8bbwe, but Skype and
# others are not), and a wrong link opens an empty Store page with no explanation.
echo "Sticky Notes is distributed through the Microsoft Store, which cannot be driven unattended."
echo "Opening the Store — search results for it will appear there."
powershell.exe -NoProfile -Command "Start-Process 'ms-windows-store://search/?query=Sticky Notes'" 2>/dev/null || true
