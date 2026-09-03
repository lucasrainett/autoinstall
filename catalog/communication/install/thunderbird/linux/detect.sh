#!/usr/bin/env bash
# Exit 0 = installed, 1 = not installed.
#
# Checks the snap, not the apt package. On Ubuntu 24.04 the `thunderbird` deb contains nothing but
# a /usr/bin/thunderbird shim that refuses to run without /snap/bin/thunderbird (verified by
# unpacking the package), so dpkg's opinion says nothing about whether Thunderbird actually works.
command -v snap >/dev/null 2>&1 || exit 1
snap list thunderbird >/dev/null 2>&1
