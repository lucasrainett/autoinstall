#!/usr/bin/env bash
set -euo pipefail

# These are Microsoft Store apps: the Store cannot be driven unattended, so this script cannot
# actually install anything. It used to open the Store page and exit 0 — claiming success while
# installing nothing, which the verification then caught as "detect still reports absent after
# install". Worse, on a machine with no Store (a CI runner) `Start-Process ms-windows-store://`
# never returns, and four of these hung for the full ten-minute timeout.
#
# Exit 3 is this catalog's "declined, nothing changed". It is the honest answer either way: with a
# desktop the Store page is opened for the user to finish by hand, and the tool still cannot claim
# the install happened.
if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ] || [ ! -t 1 ]; then
  echo "This app is distributed through the Microsoft Store, which cannot be driven" >&2
  echo "unattended. Nothing was changed. Install it from the Store by hand if you want it." >&2
  exit 3
fi


# Store apps cannot be installed unattended for a signed-in user, so this opens the Store rather
# than pretending to have installed anything.
#
# A search rather than a direct product link: the product page needs a package family name whose
# publisher segment differs per app (first-party Microsoft apps are 8wekyb3d8bbwe, but Skype and
# others are not), and a wrong link opens an empty Store page with no explanation.
echo "Camera is distributed through the Microsoft Store, which cannot be driven unattended."
echo "Opening the Store — search results for it will appear there."
powershell.exe -NoProfile -Command "Start-Process 'ms-windows-store://search/?query=Camera'" 2>/dev/null || true

# Opened, not installed — the tool cannot confirm what the user does in the Store.
exit 3
