#!/usr/bin/env bash
set -euo pipefail

# Removes the snap — the actual application. Removing only the apt package would leave Thunderbird
# fully installed and working, which is the trap this entry exists to avoid: neither the deb's
# prerm nor its postrm touches the snap (verified by unpacking the package's maintainer scripts).
if command -v snap >/dev/null 2>&1 && snap list thunderbird >/dev/null 2>&1; then
  sudo snap remove thunderbird
fi

# The apt shim is useless once the snap is gone — it exists only to point at it — so clear it too
# if the distribution installed one. Guarded because many systems will not have it.
if dpkg-query -W -f='${Status}' thunderbird 2>/dev/null | grep -q '^install ok installed$'; then
  sudo apt remove --purge -y thunderbird
fi
