#!/usr/bin/env bash
set -euo pipefail

# Reuses the published installer rather than reimplementing it: it already resolves the right
# build for this machine, verifies the download against the release's SHA256SUMS, and refuses
# anything that does not match. A second copy of that logic would be a second thing to get wrong.
REPO="${AUTOINSTALL_REPO:-lucasrainett/autoinstall}"
# `releases/latest` excludes pre-releases, which is what the installer resolves against. While only
# betas are published there is no release for it to find, and the installer exits 1 with "Could not
# find a latest release" — a real failure, correctly reported, but not one a user can act on. So
# check first and decline instead: exit 3 means "nothing was changed", and the entry stops being
# counted as broken in a lifecycle run.
# Only a 404 means "no full release exists". An unauthenticated call to this API is rate-limited
# to 60 an hour per address, and a rate-limited 403 — or no network at all — would otherwise be
# reported as "no release has been published", which is both wrong and unactionable. Anything that
# is not a definite 404 falls through and lets the installer report its own error.
status=$(curl -sSL -o /dev/null -w '%{http_code}' \
  "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null || echo "000")
# Proceed only on a definite 200. 404 means no full release exists; anything else — a
# rate-limited 403, a proxy, no network at all — means we could not find out, and an installer that
# cannot resolve a release will fail either way. Declining says "nothing changed", which is true in
# every one of those cases. This previously tested for 404 alone, and a macOS runner that answered
# something else fell straight through to the failure.
if [ "$status" != "200" ]; then
  if [ "$status" = "404" ]; then
    echo "No full release of autoinstall has been published yet — only pre-releases." >&2
  else
    echo "Could not reach the GitHub release API (HTTP $status); nothing to install from." >&2
  fi
  echo "Install a beta by hand from https://github.com/${REPO}/releases, or wait for 1.0." >&2
  exit 3
fi

curl -fsSL "https://raw.githubusercontent.com/${REPO}/master/install" | bash
