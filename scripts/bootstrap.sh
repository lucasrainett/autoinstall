#!/usr/bin/env bash
# Downloads, verifies and runs autoinstall on macOS and Linux.
#
# The checksum step is not optional. This downloads an executable that will be run with the user's
# privileges; an unverified `curl | bash` is exactly the weakness this tool should not introduce.
# If the checksum is missing or does not match, nothing is executed.
set -euo pipefail

REPO="${AUTOINSTALL_REPO:-}"
VERSION="${1:-latest}"

if [ -z "$REPO" ]; then
  cat >&2 <<'MSG'
No repository configured. This project's own repository name is not settled yet, so the bootstrap
cannot guess where to download from.

Set it explicitly:
    AUTOINSTALL_REPO=owner/name ./bootstrap.sh
MSG
  exit 1
fi

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
release=$(curl -fsSL "$api")

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
