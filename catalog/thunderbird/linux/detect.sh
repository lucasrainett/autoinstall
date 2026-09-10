#!/usr/bin/env bash
# Exit 0 = installed, 1 = not installed.
#
# Checks the snap, not the apt package. On Ubuntu 24.04 the `thunderbird` deb contains nothing but
# a /usr/bin/thunderbird shim that refuses to run without /snap/bin/thunderbird (verified by
# unpacking the package), so dpkg's opinion says nothing about whether Thunderbird actually works.
# `snap list` blocks when snapd is installed but its daemon is not running: it keeps retrying the
# socket rather than failing. Proven in an Ubuntu 24.04 container, where the thunderbird deb pulls
# snapd in as a dependency but nothing starts it — this script hung indefinitely and only the
# harness timeout ended it. The same shape exists on any machine where snapd is masked or disabled.
# `command -v snap` is not enough; the socket has to actually be there, and the call is bounded as
# well so a wedged daemon costs ten seconds rather than the run.
snap_usable() {
  command -v snap >/dev/null 2>&1 && [ -S /run/snapd.socket ]
}

snap_usable || exit 1
timeout 10 snap list thunderbird >/dev/null 2>&1
