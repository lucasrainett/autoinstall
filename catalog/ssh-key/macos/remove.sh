#!/usr/bin/env bash
set -euo pipefail

# Deliberately does NOT delete the key, and says so rather than failing silently.
#
# This is an honest asymmetry with the reversal contract: for most entries "remove" undoes
# "install", but undoing key generation means destroying a private key. That key may be authorised
# on servers, git hosts and deploy targets this tool knows nothing about, and it cannot be
# recovered afterwards. Quietly deleting it to satisfy a contract would be the single most
# damaging thing this tool could do, so the contract yields instead.
KEY="$HOME/.ssh/id_ed25519"
if [ ! -f "$KEY" ]; then
  echo "No generated key found; nothing to do."
  exit 0
fi

echo "Leaving $KEY in place on purpose."
echo "A private key is irreplaceable and may still be authorised on machines this tool does not"
echo "know about. If you are certain it is unused, delete it yourself:"
echo "    rm -i $KEY $KEY.pub"

# Exit 3, not 0: this deliberately did not remove anything, and the runner verifies each action by
# re-running detect afterwards. Reporting success made a correct, protective decision look like a
# removal that silently failed — which is exactly what happened, because an `exit 0` was left
# sitting above this line and the exit 3 was never reached.
exit 3
