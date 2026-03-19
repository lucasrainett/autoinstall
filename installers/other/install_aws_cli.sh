#!/usr/bin/env bash
# AWS CLI v2 - Official command line interface for Amazon Web Services.
# Manage AWS services from the terminal.
# https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
#
# Installs via the official AWS zip archive (always latest).

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v aws &>/dev/null && echo "AWS CLI already installed, skipping." && exit 0

cd ~/Downloads
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscli.zip
unzip -o awscli.zip
sudo ./aws/install
rm -rf aws awscli.zip
aws --version
