#!/usr/bin/env bash
# Volta - JavaScript tool manager (Node.js version manager).
# Pin and switch Node/npm/pnpm versions per project automatically.
# https://volta.sh
#
# Installs via the official install script, then sources bashrc to make
# volta available in the current session, and installs node + pnpm.

[ "$AUTOINSTALL_UPDATE" != "true" ] && [ -d "$HOME/.volta" ] && echo "Volta already installed, skipping." && exit 0

curl https://get.volta.sh | bash
source ~/.bashrc
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"

volta install node
volta install pnpm
node -v
npm -v
pnpm -v
