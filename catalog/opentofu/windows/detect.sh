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
command -v tofu >/dev/null 2>&1 || exit 1

if winget upgrade --id OpenTofu.Tofu -e --accept-source-agreements --disable-interactivity 2>/dev/null |
   grep -qi "OpenTofu.Tofu"; then
  exit 2
fi
exit 0
