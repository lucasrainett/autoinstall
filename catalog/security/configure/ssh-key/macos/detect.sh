#!/usr/bin/env bash
# Exit 0 = a key already exists, 1 = none.
#
# Accepts any of the common key types, not just the ed25519 one this entry generates: someone with
# a perfectly good RSA key does not need another key, and reporting "missing" would push them into
# generating a redundant one.
for k in id_ed25519 id_ecdsa id_rsa; do
  [ -f "$HOME/.ssh/$k" ] && exit 0
done
exit 1
