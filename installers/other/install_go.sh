#!/usr/bin/env bash
# Go - Open source programming language by Google.
# Fast, statically typed, compiled language for building scalable systems.
# https://go.dev/doc/install
#
# Downloads the latest release from go.dev and extracts to /usr/local/go.

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v go &>/dev/null && echo "Go already installed, skipping." && exit 0

cd ~/Downloads
LATEST=$(curl -fsSL "https://go.dev/VERSION?m=text" | head -1)
wget -q --show-progress -O go.tar.gz "https://go.dev/dl/${LATEST}.linux-amd64.tar.gz"
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go.tar.gz

# add to PATH if not already present
if ! grep -q '/usr/local/go/bin' ~/.bashrc; then
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
fi

export PATH=$PATH:/usr/local/go/bin
go version
