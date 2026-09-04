#!/usr/bin/env bash
# Downloads, verifies and runs autoinstall on macOS and Linux.
#
# The checksum step is not optional. This downloads an executable that will be run with the user's
# privileges; an unverified `curl | bash` is exactly the weakness this tool should not introduce.
# If the checksum is missing or does not match, nothing is executed.
set -euo pipefail

# Kept in step with DEFAULT_UPDATE_REPO in src/version.ts, which the running tool uses to check
# for its own updates. Overridable so a fork publishing its own releases works unmodified.
REPO="${AUTOINSTALL_REPO:-lucasrainett/autoinstall}"
VERSION="${1:-latest}"

case "$(uname -s)" in
  Darwin) os="apple-darwin" ;;
  Linux)  os="unknown-linux-gnu" ;;
  *) echo "Unsupported operating system: $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64|amd64)  arch="x86_64" ;;
  arm64|aarch64) arch="aarch64" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

asset="autoinstall-${arch}-${os}"
api="https://api.github.com/repos/${REPO}/releases/${VERSION}"
[ "$VERSION" = "latest" ] || api="https://api.github.com/repos/${REPO}/releases/tags/${VERSION}"

echo "Resolving release from ${REPO}..."
# Handled explicitly rather than left to `set -e`: without this the script dies on curl's own
# terse "error: 404" with no indication of what was being looked for. The two realistic causes are
# a repository that has published no releases yet and a typo in AUTOINSTALL_REPO, and the message
# names both.
if ! release=$(curl -fsSL "$api" 2>/dev/null); then
  {
    echo "Could not find a ${VERSION} release for ${REPO}."
    echo
    echo "Either that repository has not published a release yet, or the name is wrong."
    echo "Check https://github.com/${REPO}/releases — and if you meant a different repository:"
    echo
    echo "    AUTOINSTALL_REPO=owner/name $0"
  } >&2
  exit 1
fi

url=$(printf '%s' "$release" | grep -o "\"browser_download_url\": *\"[^\"]*${asset}\"" | cut -d'"' -f4 | head -1)
sums_url=$(printf '%s' "$release" | grep -o '"browser_download_url": *"[^"]*SHA256SUMS"' | cut -d'"' -f4 | head -1)

[ -n "$url" ] || { echo "This release has no ${asset} — it may not build for your platform yet." >&2; exit 1; }
[ -n "$sums_url" ] || { echo "This release publishes no SHA256SUMS, so the download cannot be verified. Refusing to run it." >&2; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Downloading ${asset}..."
curl -fsSL -o "$tmp/$asset" "$url"
curl -fsSL -o "$tmp/SHA256SUMS" "$sums_url"

expected=$(grep " ${asset}\$" "$tmp/SHA256SUMS" | awk '{print $1}' | head -1)
[ -n "$expected" ] || { echo "SHA256SUMS has no entry for ${asset}. Refusing to run an unverified binary." >&2; exit 1; }

if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$tmp/$asset" | awk '{print $1}')
else
  actual=$(shasum -a 256 "$tmp/$asset" | awk '{print $1}')   # macOS has no sha256sum
fi

if [ "$actual" != "$expected" ]; then
  echo "Checksum mismatch for ${asset} (expected ${expected}, got ${actual})." >&2
  echo "The download was discarded and nothing was run." >&2
  exit 1
fi

echo "Checksum verified. Starting autoinstall..."
chmod +x "$tmp/$asset"
"$tmp/$asset" "${@:2}"
