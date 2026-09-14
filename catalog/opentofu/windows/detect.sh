#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
#
# OpenTofu's winget package is InstallerType: zip with NestedInstallerType: portable — winget
# unpacks it and registers a `tofu` command alias rather than running an installer. It does not
# then answer `winget list --id OpenTofu.Tofu -e` the way a normally-installed package does: the
# entry installed successfully, this detect reported it absent, and the removal that followed
# failed because winget agreed there was nothing installed.
#
# For a portable package the binary on disk is the fact. winget is still asked, second, because it
# is the only one of the two that knows whether a newer version exists.
# `command -v tofu` is not enough: winget puts a portable package's shim in its own Links
# directory and adds that to PATH for *future* shells. The shell running this one started before
# the install, so the shim is on disk and invisible to it — detect reported the entry absent
# immediately after a successful install for exactly that reason.
WINGET_LINKS="${LOCALAPPDATA:-$HOME/AppData/Local}/Microsoft/WinGet/Links"
if ! command -v tofu >/dev/null 2>&1 &&
   [ ! -f "$WINGET_LINKS/tofu.exe" ] && [ ! -f "$WINGET_LINKS/tofu" ]; then
  exit 1
fi

if winget upgrade --id OpenTofu.Tofu -e --accept-source-agreements --disable-interactivity 2>/dev/null |
   grep -qi "OpenTofu.Tofu"; then
  exit 2
fi
exit 0
